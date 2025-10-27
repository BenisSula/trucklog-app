from django.core.management.base import BaseCommand
from trip_planner.models import Location


class Command(BaseCommand):
    help = 'Create sample locations for testing Trip Planner functionality'

    def handle(self, *args, **options):
        sample_locations = [
            {
                'name': 'Atlanta Distribution Center',
                'address': '1234 Industrial Blvd',
                'city': 'Atlanta',
                'state': 'GA',
                'zip_code': '30309',
                'latitude': 33.7490,
                'longitude': -84.3880,
                'is_terminal': True
            },
            {
                'name': 'Miami Warehouse',
                'address': '5678 Port Ave',
                'city': 'Miami',
                'state': 'FL',
                'zip_code': '33101',
                'latitude': 25.7617,
                'longitude': -80.1918,
                'is_terminal': True
            },
            {
                'name': 'Jacksonville Terminal',
                'address': '9012 Highway 95',
                'city': 'Jacksonville',
                'state': 'FL',
                'zip_code': '32202',
                'latitude': 30.3322,
                'longitude': -81.6557,
                'is_terminal': True
            },
            {
                'name': 'Charlotte Hub',
                'address': '3456 Trade St',
                'city': 'Charlotte',
                'state': 'NC',
                'zip_code': '28202',
                'latitude': 35.2271,
                'longitude': -80.8431,
                'is_terminal': True
            },
            {
                'name': 'Nashville Depot',
                'address': '7890 Music Row',
                'city': 'Nashville',
                'state': 'TN',
                'zip_code': '37203',
                'latitude': 36.1627,
                'longitude': -86.7816,
                'is_terminal': True
            },
            {
                'name': 'Birmingham Facility',
                'address': '2468 Steel Ave',
                'city': 'Birmingham',
                'state': 'AL',
                'zip_code': '35203',
                'latitude': 33.5186,
                'longitude': -86.8104,
                'is_terminal': False
            },
            {
                'name': 'Savannah Port',
                'address': '1357 Harbor Dr',
                'city': 'Savannah',
                'state': 'GA',
                'zip_code': '31401',
                'latitude': 32.0835,
                'longitude': -81.0998,
                'is_terminal': False
            },
            {
                'name': 'Tampa Bay Logistics',
                'address': '8642 Bay Rd',
                'city': 'Tampa',
                'state': 'FL',
                'zip_code': '33602',
                'latitude': 27.9506,
                'longitude': -82.4572,
                'is_terminal': False
            },
            {
                'name': 'Orlando Distribution',
                'address': '9753 Theme Park Way',
                'city': 'Orlando',
                'state': 'FL',
                'zip_code': '32801',
                'latitude': 28.5383,
                'longitude': -81.3792,
                'is_terminal': False
            },
            {
                'name': 'Raleigh Warehouse',
                'address': '4681 Research Dr',
                'city': 'Raleigh',
                'state': 'NC',
                'zip_code': '27601',
                'latitude': 35.7796,
                'longitude': -78.6382,
                'is_terminal': False
            }
        ]

        created_count = 0
        updated_count = 0

        for location_data in sample_locations:
            location, created = Location.objects.get_or_create(
                name=location_data['name'],
                defaults=location_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created location: {location.name}')
                )
            else:
                # Update existing location with new data
                for key, value in location_data.items():
                    setattr(location, key, value)
                location.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated location: {location.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully processed {len(sample_locations)} locations: '
                f'{created_count} created, {updated_count} updated'
            )
        )