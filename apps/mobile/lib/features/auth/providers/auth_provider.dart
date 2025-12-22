import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../core/theme/app_theme.dart';
import '../data/models/user_model.dart';

/// Auth state
class AuthState {
  final bool isAuthenticated;
  final bool isLoading;
  final User? user;
  final String? error;

  const AuthState({
    this.isAuthenticated = false,
    this.isLoading = false,
    this.user,
    this.error,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    User? user,
    String? error,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      user: user ?? this.user,
      error: error,
    );
  }
}

/// Auth state provider
final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref);
});

/// Auth notifier
class AuthNotifier extends StateNotifier<AuthState> {
  final Ref _ref;

  AuthNotifier(this._ref) : super(const AuthState()) {
    _initAuth();
  }

  /// Check for existing session on app start
  Future<void> _initAuth() async {
    state = state.copyWith(isLoading: true);
    
    try {
      final storage = _ref.read(secureStorageProvider);
      final hasTokens = await storage.hasTokens();
      
      if (hasTokens) {
        // Try to get current user
        await _fetchCurrentUser();
      }
    } catch (e) {
      // Silent fail, user will need to login
    } finally {
      state = state.copyWith(isLoading: false);
    }
  }

  /// Login with email and password
  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final dio = _ref.read(dioProvider);
      final response = await dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      if (response.data['success'] == true) {
        final data = response.data['data'];
        
        // Save tokens
        final storage = _ref.read(secureStorageProvider);
        await storage.saveTokens(
          accessToken: data['accessToken'],
          refreshToken: data['refreshToken'],
        );

        // Fetch user info using the new token
        await _fetchCurrentUser();

        // Fetch branding after login
        await _fetchBranding();

        state = state.copyWith(isLoading: false);

        return state.isAuthenticated;
      }
      
      state = state.copyWith(
        isLoading: false,
        error: 'Login failed',
      );
      return false;
    } on DioException catch (e) {
      final message = e.response?.data?['error']?['message'] ?? 'Login failed';
      state = state.copyWith(isLoading: false, error: message);
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'An error occurred: $e');
      return false;
    }
  }

  /// Register new account
  Future<bool> register({
    required String email,
    required String password,
    required String name,
    required String tenantName,
    required String tenantSlug,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final dio = _ref.read(dioProvider);
      final response = await dio.post('/auth/register', data: {
        'email': email,
        'password': password,
        'name': name,
        'tenantName': tenantName,
        'tenantSlug': tenantSlug,
      });

      if (response.data['success'] == true) {
        final data = response.data['data'];
        
        // Save tokens
        final storage = _ref.read(secureStorageProvider);
        await storage.saveTokens(
          accessToken: data['accessToken'],
          refreshToken: data['refreshToken'],
        );

        // Fetch user info using the new token
        await _fetchCurrentUser();

        // Fetch branding
        await _fetchBranding();

        state = state.copyWith(isLoading: false);

        return state.isAuthenticated;
      }
      
      state = state.copyWith(
        isLoading: false,
        error: 'Registration failed',
      );
      return false;
    } on DioException catch (e) {
      final message = e.response?.data?['error']?['message'] ?? 'Registration failed';
      state = state.copyWith(isLoading: false, error: message);
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'An error occurred: $e');
      return false;
    }
  }

  /// Logout
  Future<void> logout() async {
    try {
      final dio = _ref.read(dioProvider);
      await dio.post('/auth/logout');
    } catch (e) {
      // Ignore errors
    } finally {
      final storage = _ref.read(secureStorageProvider);
      await storage.clearAll();
      state = const AuthState();
    }
  }

  /// Fetch current user info
  Future<void> _fetchCurrentUser() async {
    try {
      final dio = _ref.read(dioProvider);
      final response = await dio.post('/auth/me');

      if (response.data['success'] == true) {
        final user = User.fromJson(response.data['data']);
        
        // Save user info
        final storage = _ref.read(secureStorageProvider);
        await storage.saveUserInfo(
          userId: user.id,
          tenantId: user.tenantId,
        );
        
        state = state.copyWith(
          isAuthenticated: true,
          user: user,
        );
      }
    } catch (e) {
      // Token might be invalid
      final storage = _ref.read(secureStorageProvider);
      await storage.clearAll();
      state = state.copyWith(isAuthenticated: false, user: null);
    }
  }

  /// Fetch tenant branding configuration
  Future<void> _fetchBranding() async {
    try {
      final dio = _ref.read(dioProvider);
      final response = await dio.get('/tenant/branding');

      if (response.data['success'] == true) {
        final branding = BrandingConfig.fromJson(response.data['data']);
        _ref.read(brandingProvider.notifier).state = branding;
      }
    } catch (e) {
      // Use default branding
    }
  }
}

