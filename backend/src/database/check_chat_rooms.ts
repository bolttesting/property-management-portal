import { query, pool } from './connection';

async function checkAndCreateChatRooms() {
  try {
    // Check if table exists
    const checkResult = await query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_rooms'`
    );

    if (checkResult.rows.length === 0) {
      console.log('⚠️  chat_rooms table does not exist. Creating it...');
      
      // Create chat_rooms table
      await query(`
        CREATE TABLE chat_rooms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          room_type VARCHAR(20) NOT NULL CHECK (room_type IN ('tenant_owner', 'owner_tenant', 'tenant_admin', 'owner_admin', 'support')),
          participant1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          participant1_type VARCHAR(20) NOT NULL CHECK (participant1_type IN ('tenant', 'owner', 'admin')),
          participant2_id UUID REFERENCES users(id) ON DELETE CASCADE,
          participant2_type VARCHAR(20) CHECK (participant2_type IN ('tenant', 'owner', 'admin')),
          last_message_at TIMESTAMP,
          last_message_preview TEXT,
          unread_count_participant1 INTEGER DEFAULT 0,
          unread_count_participant2 INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(participant1_id, participant2_id, room_type)
        )
      `);

      // Create indexes
      await query(`CREATE INDEX idx_chat_rooms_participant1_id ON chat_rooms(participant1_id)`);
      await query(`CREATE INDEX idx_chat_rooms_participant2_id ON chat_rooms(participant2_id)`);
      await query(`CREATE INDEX idx_chat_rooms_last_message_at ON chat_rooms(last_message_at)`);

      console.log('✅ chat_rooms table created successfully!');
    } else {
      console.log('✅ chat_rooms table already exists');
      
      // Check if constraint needs updating
      const constraintCheck = await query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'chat_rooms' 
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%room_type%'
      `);

      if (constraintCheck.rows.length > 0) {
        console.log('Updating room_type constraint...');
        try {
          await query(`ALTER TABLE chat_rooms DROP CONSTRAINT IF EXISTS chat_rooms_room_type_check`);
          await query(`
            ALTER TABLE chat_rooms 
            ADD CONSTRAINT chat_rooms_room_type_check 
            CHECK (room_type IN ('tenant_owner', 'owner_tenant', 'tenant_admin', 'owner_admin', 'support'))
          `);
          console.log('✅ Constraint updated');
        } catch (error: any) {
          if (error.code !== '42704') { // Ignore if constraint doesn't exist
            console.log('⚠️  Could not update constraint (might already be correct):', error.message);
          }
        }
      }
    }

    // Also check for chat_messages table
    const messagesCheck = await query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_messages'`
    );

    if (messagesCheck.rows.length === 0) {
      console.log('⚠️  chat_messages table does not exist. Creating it...');
      
      await query(`
        CREATE TABLE chat_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
          sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('tenant', 'owner', 'admin')),
          recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
          recipient_type VARCHAR(20) CHECK (recipient_type IN ('tenant', 'owner', 'admin')),
          message TEXT NOT NULL,
          message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
          attachment_url VARCHAR(500),
          is_read BOOLEAN DEFAULT FALSE,
          read_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await query(`CREATE INDEX idx_chat_messages_chat_room_id ON chat_messages(chat_room_id)`);
      await query(`CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id)`);
      await query(`CREATE INDEX idx_chat_messages_recipient_id ON chat_messages(recipient_id)`);
      await query(`CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at)`);

      console.log('✅ chat_messages table created successfully!');
    } else {
      console.log('✅ chat_messages table already exists');
    }

    console.log('\n✅ All chat tables are ready!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
    if (error.detail) {
      console.error('Error detail:', error.detail);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkAndCreateChatRooms();

