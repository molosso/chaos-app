from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken


def revoke_refresh_tokens(user):
    """Révoque tous les jetons de rafraîchissement déjà émis pour ce compte."""
    for token in OutstandingToken.objects.filter(user=user).iterator():
        BlacklistedToken.objects.get_or_create(token=token)
