"""
WebSocket consumers for real-time features
"""

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    Consumer for real-time notifications
    """
    
    async def connect(self):
        # Get user from URL parameters or scope
        user_id = self.scope.get('url_route', {}).get('kwargs', {}).get('user_id')
        self.user = self.scope.get("user")
        
        logger.info(f"WebSocket connection attempt - user_id: {user_id}, user: {self.user}")
        print(f"WebSocket connection attempt - user_id: {user_id}, user: {self.user}")
        
        # Accept connection first, then set up room
        await self.accept()
        
        # Determine user ID
        if user_id:
            self.user_id = int(user_id)
        elif self.user and self.user.is_authenticated:
            self.user_id = self.user.id
        else:
            # For development, default to user 1
            self.user_id = 1
            
        self.room_group_name = f"notifications_{self.user_id}"
        
        # Join room group
        try:
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            logger.info(f"User {self.user_id} joined room: {self.room_group_name}")
            print(f"User {self.user_id} joined room: {self.room_group_name}")
            
            # Send connection confirmation
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'data': {
                    'user_id': self.user_id,
                    'room': self.room_group_name,
                    'message': 'WebSocket connected successfully'
                }
            }))
        except Exception as e:
            logger.error(f"Error joining room: {e}")
            print(f"Error joining room: {e}")
    
    async def disconnect(self, close_code):
        logger.info(f"WebSocket disconnected with code: {close_code}")
        print(f"WebSocket disconnected with code: {close_code}")
        
        if hasattr(self, 'room_group_name'):
            try:
                # Leave room group
                await self.channel_layer.group_discard(
                    self.room_group_name,
                    self.channel_name
                )
                logger.info(f"User left room: {self.room_group_name}")
            except Exception as e:
                logger.error(f"Error leaving room: {e}")
    
    # Receive message from WebSocket
    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            logger.info(f"Received message: {text_data_json}")
            print(f"Received message: {text_data_json}")
            
            # Handle different message types
            if 'type' in text_data_json:
                message_type = text_data_json['type']
                
                # Handle ping/pong messages
                if message_type == 'ping':
                    await self.send(text_data=json.dumps({
                        'type': 'pong', 
                        'data': {
                            'timestamp': text_data_json.get('data', {}).get('timestamp')
                        }
                    }))
                    return
                
                # Handle subscription messages
                elif message_type == 'subscribe':
                    channel = text_data_json.get('data', {}).get('channel')
                    if channel:
                        # Add to additional channel groups if needed
                        await self.channel_layer.group_add(
                            f"{self.room_group_name}_{channel}",
                            self.channel_name
                        )
                        await self.send(text_data=json.dumps({
                            'type': 'subscribed',
                            'data': {'channel': channel}
                        }))
                    return
                
                # Handle unsubscribe messages
                elif message_type == 'unsubscribe':
                    channel = text_data_json.get('data', {}).get('channel')
                    if channel:
                        await self.channel_layer.group_discard(
                            f"{self.room_group_name}_{channel}",
                            self.channel_name
                        )
                        await self.send(text_data=json.dumps({
                            'type': 'unsubscribed',
                            'data': {'channel': channel}
                        }))
                    return
            
            # For other messages, broadcast to room group
            if hasattr(self, 'room_group_name'):
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'notification_message',
                        'message': text_data_json
                    }
                )
                
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON received: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'data': {'message': 'Invalid JSON format'}
            }))
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'data': {'message': str(e)}
            }))
    
    # Receive message from room group
    async def notification_message(self, event):
        message = event['message']
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'data': message
        }))


class TripUpdateConsumer(AsyncWebsocketConsumer):
    """
    Consumer for real-time trip updates
    """
    
    async def connect(self):
        self.trip_id = self.scope['url_route']['kwargs']['trip_id']
        self.trip_group_name = f'trip_{self.trip_id}'
        
        logger.info(f"Trip WebSocket connection for trip {self.trip_id}")
        print(f"Trip WebSocket connection for trip {self.trip_id}")
        
        # Accept connection
        await self.accept()
        
        # Join room group
        try:
            await self.channel_layer.group_add(
                self.trip_group_name,
                self.channel_name
            )
            
            # Send connection confirmation
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'data': {
                    'trip_id': self.trip_id,
                    'room': self.trip_group_name,
                    'message': 'Trip WebSocket connected successfully'
                }
            }))
        except Exception as e:
            logger.error(f"Error joining trip room: {e}")
    
    async def disconnect(self, close_code):
        logger.info(f"Trip WebSocket disconnected with code: {close_code}")
        
        # Leave room group
        try:
            await self.channel_layer.group_discard(
                self.trip_group_name,
                self.channel_name
            )
        except Exception as e:
            logger.error(f"Error leaving trip room: {e}")
    
    # Receive message from WebSocket
    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            logger.info(f"Trip message received: {text_data_json}")
            
            # Handle ping/pong messages
            if text_data_json.get('type') == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong', 
                    'data': {
                        'timestamp': text_data_json.get('data', {}).get('timestamp')
                    }
                }))
                return
            
            # Broadcast to trip room
            await self.channel_layer.group_send(
                self.trip_group_name,
                {
                    'type': 'trip_update',
                    'message': text_data_json
                }
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in trip message: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'data': {'message': 'Invalid JSON format'}
            }))
        except Exception as e:
            logger.error(f"Error processing trip message: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'data': {'message': str(e)}
            }))
    
    # Receive message from room group
    async def trip_update(self, event):
        message = event['message']
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'trip_update',
            'data': message
        }))