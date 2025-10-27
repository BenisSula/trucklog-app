from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication"""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and return a regular user with an email and password"""
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and return a superuser with an email and password"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Extended User model for truck drivers"""
    username = None  # Remove username field
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, blank=True)
    license_number = models.CharField(max_length=20, blank=True)
    company_name = models.CharField(max_length=100, blank=True)
    is_driver = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"


class DriverProfile(models.Model):
    """Extended profile for drivers with FMCSA-specific information"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='driver_profile')
    cdl_number = models.CharField(max_length=20, blank=True)
    cdl_state = models.CharField(max_length=2, blank=True)
    cdl_expiry = models.DateField(null=True, blank=True)
    medical_cert_expiry = models.DateField(null=True, blank=True)
    dot_number = models.CharField(max_length=20, blank=True)
    carrier_name = models.CharField(max_length=100, blank=True)
    home_terminal = models.CharField(max_length=100, blank=True)
    timezone = models.CharField(max_length=50, default='America/New_York')
    
    # HOS Settings
    cycle_type = models.CharField(
        max_length=20,
        choices=[
            ('70_8', '70/8 Hour Cycle'),
            ('60_7', '60/7 Hour Cycle'),
            ('34_hour', '34-Hour Restart'),
        ],
        default='70_8'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'driver_profiles'
        verbose_name = 'Driver Profile'
        verbose_name_plural = 'Driver Profiles'
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.cdl_number}"