from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'List all users in the database'

    def handle(self, *args, **options):
        users = User.objects.all()
        
        if not users.exists():
            self.stdout.write(
                self.style.WARNING('No users found in the database.')
            )
            return
        
        self.stdout.write(
            self.style.SUCCESS(f'Found {users.count()} user(s):')
        )
        
        for user in users:
            status = []
            if user.is_superuser:
                status.append('SUPERUSER')
            if user.is_staff:
                status.append('STAFF')
            if not user.is_active:
                status.append('INACTIVE')
            
            status_str = f" [{', '.join(status)}]" if status else ""
            
            self.stdout.write(
                f'  - {user.email} ({user.first_name} {user.last_name}){status_str}'
            )