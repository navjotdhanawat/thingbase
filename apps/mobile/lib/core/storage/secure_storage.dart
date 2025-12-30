import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Secure storage provider
final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

/// Service for securely storing sensitive data like tokens
/// Uses flutter_secure_storage on mobile and shared_preferences on web
class SecureStorageService {
  static const _keyAccessToken = 'access_token';
  static const _keyRefreshToken = 'refresh_token';
  static const _keyUserId = 'user_id';
  static const _keyTenantId = 'tenant_id';

  // Use flutter_secure_storage for mobile platforms
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );
  
  // Cache for SharedPreferences (used on web)
  SharedPreferences? _prefs;
  
  Future<SharedPreferences> get _sharedPrefs async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }
  
  // Platform-aware read
  Future<String?> _read(String key) async {
    if (kIsWeb) {
      final prefs = await _sharedPrefs;
      return prefs.getString(key);
    }
    return _secureStorage.read(key: key);
  }
  
  // Platform-aware write
  Future<void> _write(String key, String value) async {
    if (kIsWeb) {
      final prefs = await _sharedPrefs;
      await prefs.setString(key, value);
    } else {
      await _secureStorage.write(key: key, value: value);
    }
  }
  
  // Platform-aware delete
  Future<void> _delete(String key) async {
    if (kIsWeb) {
      final prefs = await _sharedPrefs;
      await prefs.remove(key);
    } else {
      await _secureStorage.delete(key: key);
    }
  }
  
  // Platform-aware delete all
  Future<void> _deleteAll() async {
    if (kIsWeb) {
      final prefs = await _sharedPrefs;
      await prefs.clear();
    } else {
      await _secureStorage.deleteAll();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _write(_keyAccessToken, accessToken),
      _write(_keyRefreshToken, refreshToken),
    ]);
  }

  Future<String?> getAccessToken() async {
    return _read(_keyAccessToken);
  }

  Future<String?> getRefreshToken() async {
    return _read(_keyRefreshToken);
  }

  Future<void> clearTokens() async {
    await Future.wait([
      _delete(_keyAccessToken),
      _delete(_keyRefreshToken),
    ]);
  }

  Future<bool> hasTokens() async {
    final accessToken = await getAccessToken();
    return accessToken != null && accessToken.isNotEmpty;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USER INFO
  // ═══════════════════════════════════════════════════════════════════════════

  Future<void> saveUserInfo({
    required String userId,
    required String tenantId,
  }) async {
    await Future.wait([
      _write(_keyUserId, userId),
      _write(_keyTenantId, tenantId),
    ]);
  }

  Future<String?> getUserId() async {
    return _read(_keyUserId);
  }

  Future<String?> getTenantId() async {
    return _read(_keyTenantId);
  }

  Future<void> clearUserInfo() async {
    await Future.wait([
      _delete(_keyUserId),
      _delete(_keyTenantId),
    ]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAR ALL
  // ═══════════════════════════════════════════════════════════════════════════

  /// Clears all data except remembered credentials
  Future<void> clearAll() async {
    // Clear tokens and user info, but keep remembered credentials
    await Future.wait([
      clearTokens(),
      clearUserInfo(),
    ]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REMEMBER ME / SAVED CREDENTIALS
  // ═══════════════════════════════════════════════════════════════════════════

  static const _keySavedEmail = 'saved_email';
  static const _keySavedPassword = 'saved_password';
  static const _keyRememberMe = 'remember_me';

  /// Save login credentials for "Remember Me" feature
  Future<void> saveCredentials({
    required String email,
    required String password,
  }) async {
    await Future.wait([
      _write(_keySavedEmail, email),
      _write(_keySavedPassword, password),
      _write(_keyRememberMe, 'true'),
    ]);
  }

  /// Get saved credentials
  Future<({String? email, String? password, bool rememberMe})> getSavedCredentials() async {
    final results = await Future.wait([
      _read(_keySavedEmail),
      _read(_keySavedPassword),
      _read(_keyRememberMe),
    ]);
    return (
      email: results[0],
      password: results[1],
      rememberMe: results[2] == 'true',
    );
  }

  /// Clear saved credentials
  Future<void> clearSavedCredentials() async {
    await Future.wait([
      _delete(_keySavedEmail),
      _delete(_keySavedPassword),
      _delete(_keyRememberMe),
    ]);
  }
}
