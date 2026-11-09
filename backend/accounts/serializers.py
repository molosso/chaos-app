from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class ChaosTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Ajoute le rôle et le nom d'utilisateur dans le jeton, pratique côté frontend."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["username"] = user.username
        return token


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "role", "institution", "first_name", "email"]
        read_only_fields = ["id", "username", "role", "institution"]


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Le mot de passe actuel est incorrect.")
        return value


class TeacherCreateSerializer(serializers.ModelSerializer):
    """Utilisé par l'administrateur pour créer un compte enseignant."""

    password = serializers.CharField(write_only=True, min_length=6, validators=[validate_password])

    class Meta:
        model = User
        fields = ["id", "username", "password", "first_name", "institution"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(role=User.Role.TEACHER, **validated_data)
        user.set_password(password)
        user.save()
        return user


class StudentAccountCreateSerializer(serializers.ModelSerializer):
    """
    Compte élève optionnel : ni email, ni donnée personnelle au-delà d'un
    prénom et d'un mot de passe choisis par l'élève lui-même.
    """

    password = serializers.CharField(write_only=True, min_length=6, validators=[validate_password])
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = ["id", "username", "password", "first_name", "email"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(role=User.Role.STUDENT, **validated_data)
        user.set_password(password)
        user.save()
        return user


class AdminUserSerializer(serializers.ModelSerializer):
    """
    Vue complète d'un compte pour l'interface d'administration.
    Le mot de passe n'est jamais renvoyé : il est seulement accepté en écriture.
    """

    password = serializers.CharField(write_only=True, required=False, min_length=6, validators=[validate_password])
    # Valeur par défaut explicite : sans elle, un envoi de formulaire classique
    # (non JSON) lirait un champ absent comme False et créerait un compte désactivé.
    is_active = serializers.BooleanField(required=False, default=True)
    classroom_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "email", "role", "institution",
            "is_active", "date_joined", "last_login", "password", "classroom_count",
        ]
        read_only_fields = ["date_joined", "last_login"]

    def get_classroom_count(self, obj):
        annotated = getattr(obj, "classroom_count", None)
        if annotated is not None:
            return annotated
        return obj.classrooms.count() if obj.role == User.Role.TEACHER else 0

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Un mot de passe est requis."})
        return attrs

    def _apply_staff_flag(self, user):
        # Un compte administrateur peut aussi ouvrir Django Admin ; les autres non.
        if user.is_superuser:
            return
        user.is_staff = user.role == User.Role.ADMIN

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        self._apply_staff_flag(user)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        self._apply_staff_flag(instance)
        instance.save()
        return instance


class PasswordResetSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])


class PasswordResetRequestSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
