import 'package:firebase_auth/firebase_auth.dart';

class AuthService {
  AuthService({FirebaseAuth? auth}) : _auth = auth;

  final FirebaseAuth? _auth;

  FirebaseAuth get _instance => _auth ?? FirebaseAuth.instance;

  Stream<User?> authStateChanges() => _instance.authStateChanges();

  User? get currentUser => _instance.currentUser;

  Future<void> signInAsGuest() async {
    await _instance.signInAnonymously();
  }

  Future<void> signInWithEmail({
    required String email,
    required String password,
  }) async {
    await _instance.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
  }

  Future<void> registerWithEmail({
    required String email,
    required String password,
  }) async {
    await _instance.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );
  }

  Future<void> signOut() async {
    await _instance.signOut();
  }
}
