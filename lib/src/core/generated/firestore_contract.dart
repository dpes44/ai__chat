// GENERATED FILE. DO NOT EDIT.
// Source: contracts/firestore-structure.json

class FirestoreCollections {
  static const String adminAuth = 'admin_auth';
  static const String adminAuditLogs = 'admin_audit_logs';
  static const String appConfig = 'app_config';
  static const String usersRouter = 'usersrouter';
  static const String prompts = 'prompts';
  static const String keys = 'keys';
  static const String users = 'users';
  static const String nicknameClaims = 'nickname_claims';
  static const String doctors = 'doctors';
  static const String appointments = 'appointments';
  static const String threads = 'threads';
  static const String userMoods = 'user_moods';
  static const String aiRequestLogs = 'ai_request_logs';
  static const String aiMetricsDaily = 'ai_metrics_daily';
  static const String moodMetricsDaily = 'mood_metrics_daily';
  static const String contentEmergencyNumbers = 'content_emergency_numbers';
  static const String contentTools = 'content_tools';
  static const String contentTherapistSubscriptions = 'content_therapist_subscriptions';
  static const String contentLegal = 'content_legal';
  static const String systemBootstrap = 'system_bootstrap';
}


class FirestoreSubcollections {
  static const String forumReplies = 'replies';
  static const String moodLogs = 'mood_logs';
}


class FirestoreDocs {
  static const String adminAuthRoot = 'admin_auth/root_admin';
  static const String aiRouting = 'app_config/ai_routing';
  static const String aiProviderKeys = 'app_config/provider_keys';
  static const String usersRouterCurrent = 'usersrouter/current';
  static const String promptsCurrent = 'prompts/current';
  static const String keysProviders = 'keys/providers';
  static const String systemBootstrapCollections = 'system_bootstrap/collections';
}


class FirestoreBootstrap {
  static const List<String> requiredCollections = <String>[
    'admin_auth',
    'admin_audit_logs',
    'app_config',
    'usersrouter',
    'prompts',
    'keys',
    'users',
    'nickname_claims',
    'doctors',
    'appointments',
    'threads',
    'threads/{threadId}/replies',
    'user_moods',
    'ai_request_logs',
    'ai_metrics_daily',
    'mood_metrics_daily',
    'content_emergency_numbers',
    'content_tools',
    'content_therapist_subscriptions',
    'content_legal',
  ];

  static const List<String> requiredDocs = <String>[
    'usersrouter/current',
    'prompts/current',
    'keys/providers',
    'app_config/ai_routing',
    'app_config/provider_keys',
    'system_bootstrap/collections',
  ];

}
