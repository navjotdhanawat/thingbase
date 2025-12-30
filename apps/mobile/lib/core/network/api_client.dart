import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/app_config.dart';
import '../storage/secure_storage.dart';

/// Auth event types
enum AuthEvent {
  tokenRefreshed,
  sessionExpired,
  loggedOut,
}

/// Global auth event controller - used to signal auth state changes
final authEventController = StreamController<AuthEvent>.broadcast();

/// Stream provider for auth events
final authEventProvider = StreamProvider<AuthEvent>((ref) {
  return authEventController.stream;
});

/// Dio HTTP client provider
final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: AppConfig.current.apiBaseUrl,
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  ));

  // Add interceptors
  dio.interceptors.add(AuthInterceptor(ref));
  dio.interceptors.add(LogInterceptor(
    requestBody: true,
    responseBody: true,
    logPrint: (object) => debugPrint('📡 $object'),
  ));

  return dio;
});

/// Auth interceptor for JWT token handling with proper refresh logic
class AuthInterceptor extends Interceptor {
  final Ref _ref;
  
  // Lock to prevent concurrent token refresh
  bool _isRefreshing = false;
  
  // Queue of requests waiting for token refresh
  final List<({RequestOptions options, ErrorInterceptorHandler handler})> _pendingRequests = [];

  AuthInterceptor(this._ref);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    // Skip auth for public endpoints
    // Use endsWith to avoid substring matching (e.g., /devices/claim vs /devices/claim-token)
    final publicPaths = ['/auth/login', '/auth/register', '/auth/refresh', '/devices/claim'];
    final isPublic = publicPaths.any((path) => options.path.endsWith(path));

    if (!isPublic) {
      final storage = _ref.read(secureStorageProvider);
      final accessToken = await storage.getAccessToken();
      
      if (accessToken != null) {
        options.headers['Authorization'] = 'Bearer $accessToken';
        print('📡 [Auth] Token attached (${accessToken.substring(0, 20)}...)');
      } else {
        print('📡 [Auth] WARNING: No access token found for ${options.path}');
      }
    } else {
      print('📡 [Auth] Skipping auth for public path: ${options.path}');
    }

    handler.next(options);
  }


  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Skip refresh for auth endpoints to avoid infinite loop
      if (err.requestOptions.path.contains('/auth/')) {
        handler.next(err);
        return;
      }

      // If already refreshing, queue this request
      if (_isRefreshing) {
        _pendingRequests.add((options: err.requestOptions, handler: handler));
        return;
      }

      _isRefreshing = true;

      try {
        final freshToken = await _refreshToken();
        
        if (freshToken != null) {
          // Retry the original request with fresh token
          final response = await _retry(err.requestOptions, freshToken);
          handler.resolve(response);
          
          // Process queued requests with fresh token
          _processQueue(freshToken);
        } else {
          // Refresh failed - session expired
          await _handleSessionExpired();
          handler.next(err);
          _processQueueFailed();
        }
      } catch (e) {
        await _handleSessionExpired();
        handler.next(err);
        _processQueueFailed();
      } finally {
        _isRefreshing = false;
      }
      return;
    }
    
    handler.next(err);
  }

  /// Process queued requests after token refresh with fresh token
  void _processQueue(String freshToken) async {
    for (final pending in _pendingRequests) {
      try {
        final response = await _retry(pending.options, freshToken);
        pending.handler.resolve(response);
      } catch (e) {
        pending.handler.reject(DioException(
          requestOptions: pending.options,
          error: e,
        ));
      }
    }
    _pendingRequests.clear();
  }

  /// Process queued requests when refresh failed
  void _processQueueFailed() {
    for (final pending in _pendingRequests) {
      pending.handler.reject(DioException(
        requestOptions: pending.options,
        error: 'Session expired',
        type: DioExceptionType.unknown,
      ));
    }
    _pendingRequests.clear();
  }

  /// Refresh token - returns new access token on success, null on failure
  Future<String?> _refreshToken() async {
    try {
      final storage = _ref.read(secureStorageProvider);
      final refreshToken = await storage.getRefreshToken();
      
      if (refreshToken == null) {
        print('📡 No refresh token available');
        return null;
      }

      print('📡 Attempting token refresh...');
      
      // Use a separate Dio instance to avoid interceptor loop
      final dio = Dio(BaseOptions(baseUrl: AppConfig.current.apiBaseUrl));
      final response = await dio.post('/auth/refresh', data: {
        'refreshToken': refreshToken,
      });

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        final newAccessToken = data['accessToken'] as String;
        
        // Save tokens to storage (for future app restarts)
        await storage.saveTokens(
          accessToken: newAccessToken,
          refreshToken: data['refreshToken'],
        );
        print('📡 Token refreshed successfully');
        authEventController.add(AuthEvent.tokenRefreshed);
        return newAccessToken;
      }
      
      print('📡 Token refresh failed: ${response.data}');
      return null;
    } catch (e) {
      print('📡 Token refresh error: $e');
      return null;
    }
  }

  /// Retry request with fresh access token
  Future<Response> _retry(RequestOptions requestOptions, String accessToken) async {
    final options = Options(
      method: requestOptions.method,
      headers: {
        ...requestOptions.headers,
        'Authorization': 'Bearer $accessToken',
      },
    );

    // Use a fresh Dio to avoid recursive interceptor calls
    final dio = Dio(BaseOptions(baseUrl: AppConfig.current.apiBaseUrl));
    return dio.request(
      requestOptions.path,
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
      options: options,
    );
  }


  Future<void> _handleSessionExpired() async {
    print('📡 Session expired - logging out');
    final storage = _ref.read(secureStorageProvider);
    await storage.clearAll();
    
    // Notify listeners that session has expired
    authEventController.add(AuthEvent.sessionExpired);
  }
}

/// API response wrapper
class ApiResponse<T> {
  final bool success;
  final T? data;
  final ApiError? error;

  ApiResponse({
    required this.success,
    this.data,
    this.error,
  });

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic)? fromData,
  ) {
    return ApiResponse(
      success: json['success'] ?? false,
      data: json['data'] != null && fromData != null 
          ? fromData(json['data']) 
          : json['data'],
      error: json['error'] != null 
          ? ApiError.fromJson(json['error']) 
          : null,
    );
  }
}

/// API error
class ApiError {
  final String code;
  final String message;
  final int? statusCode;

  ApiError({
    required this.code,
    required this.message,
    this.statusCode,
  });

  factory ApiError.fromJson(Map<String, dynamic> json) {
    return ApiError(
      code: json['code'] ?? 'UNKNOWN_ERROR',
      message: json['message'] ?? 'An error occurred',
      statusCode: json['statusCode'],
    );
  }
}
