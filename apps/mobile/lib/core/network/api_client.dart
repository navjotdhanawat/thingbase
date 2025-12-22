import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/app_config.dart';
import '../storage/secure_storage.dart';

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
    logPrint: (object) => print('📡 $object'),
  ));

  return dio;
});

/// Auth interceptor for JWT token handling
class AuthInterceptor extends Interceptor {
  final Ref _ref;

  AuthInterceptor(this._ref);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    // Skip auth for public endpoints
    final publicPaths = ['/auth/login', '/auth/register', '/auth/refresh', '/devices/claim'];
    final isPublic = publicPaths.any((path) => options.path.contains(path));

    if (!isPublic) {
      final storage = _ref.read(secureStorageProvider);
      final accessToken = await storage.getAccessToken();
      
      if (accessToken != null) {
        options.headers['Authorization'] = 'Bearer $accessToken';
      }
    }

    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Try to refresh token
      final refreshed = await _refreshToken();
      if (refreshed) {
        // Retry original request
        try {
          final response = await _retry(err.requestOptions);
          handler.resolve(response);
          return;
        } catch (e) {
          // Refresh failed, logout
          await _logout();
        }
      } else {
        await _logout();
      }
    }
    handler.next(err);
  }

  Future<bool> _refreshToken() async {
    try {
      final storage = _ref.read(secureStorageProvider);
      final refreshToken = await storage.getRefreshToken();
      
      if (refreshToken == null) return false;

      final dio = Dio(BaseOptions(baseUrl: AppConfig.current.apiBaseUrl));
      final response = await dio.post('/auth/refresh', data: {
        'refreshToken': refreshToken,
      });

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        await storage.saveTokens(
          accessToken: data['accessToken'],
          refreshToken: data['refreshToken'],
        );
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<Response> _retry(RequestOptions requestOptions) async {
    final storage = _ref.read(secureStorageProvider);
    final accessToken = await storage.getAccessToken();
    
    final options = Options(
      method: requestOptions.method,
      headers: {
        ...requestOptions.headers,
        'Authorization': 'Bearer $accessToken',
      },
    );

    final dio = _ref.read(dioProvider);
    return dio.request(
      requestOptions.path,
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
      options: options,
    );
  }

  Future<void> _logout() async {
    final storage = _ref.read(secureStorageProvider);
    await storage.clearTokens();
    // Navigate to login will be handled by auth state
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

