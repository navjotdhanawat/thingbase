/// User model
class User {
  final String id;
  final String email;
  final String? name;
  final String role;
  final String tenantId;

  const User({
    required this.id,
    required this.email,
    this.name,
    required this.role,
    required this.tenantId,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      name: json['name'],
      role: json['role'],
      tenantId: json['tenantId'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'role': role,
      'tenantId': tenantId,
    };
  }

  bool get isAdmin => role == 'admin';
}

