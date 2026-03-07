import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
# 导入你的模型
from .models import ChatMessage, User 

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.other_user_id = self.scope['url_route']['kwargs']['user_id']
        self.user = self.scope['user']
        self.my_id = self.user.id
        
        if self.my_id is None:
            await self.close()
            return

        ids = sorted([int(self.my_id), int(self.other_user_id)])
        self.room_group_name = f'chat_{ids[0]}_{ids[1]}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']
        sender_name = self.user.username

        # --- 核心修正 1：必须在此处调用保存函数，并加上 await ---
        await self.save_message(self.my_id, self.other_user_id, message)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'sender': sender_name
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'sender': event['sender']
        }))

    # --- 核心修正 2：新增异步保存方法 ---
    @database_sync_to_async
    def save_message(self, sender_id, receiver_id, message):
        try:
            # 确保使用你模型中定义的字段名 'sender' 和 'receiver'
            sender = User.objects.get(id=sender_id)
            receiver = User.objects.get(id=receiver_id)
            
            ChatMessage.objects.create(
                sender=sender,
                receiver=receiver,
                message=message
            )
            print(f"DEBUG: Message saved successfully from {sender.username}")
        except Exception as e:
            print(f"DEBUG: Error saving message: {e}")