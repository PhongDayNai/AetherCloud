import { IncomingMessage, Server } from 'http';
import { Socket } from 'net';
import crypto from 'crypto';
import url from 'url';
import { verifyAccess } from './auth';

// Map lưu trữ socket của các user đang online: userId -> Set<Socket>
const userSockets = new Map<string, Set<Socket>>();

export function initWebSocket(server: Server) {
  server.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
    // Đăng ký bắt lỗi socket ngay lập tức để tránh crash server khi có lỗi truyền thông
    socket.on('error', () => {
      try { socket.destroy(); } catch (e) {}
    });

    try {
      const parsedUrl = url.parse(req.url || '', true);
      
      // Chỉ xử lý các kết nối WebSocket đến đúng đường dẫn đăng ký nhận thông báo
      if (parsedUrl.pathname !== '/ws' && parsedUrl.pathname !== '/api/ws' && parsedUrl.pathname !== '/api/notifications/ws') {
        return;
      }

      const token = parsedUrl.query.token as string;
      
      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      
      // Xác thực token
      let decoded: any;
      try {
        decoded = verifyAccess(token);
      } catch (err) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      
      const userId = decoded.sub;
      if (!userId) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      
      // Thực hiện handshake
      const key = req.headers['sec-websocket-key'];
      if (!key) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }
      
      const acceptKey = crypto
        .createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary')
        .digest('base64');
        
      const responseHeaders = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${acceptKey}`
      ];
      
      socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');
      
      // Lưu trữ kết nối
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId)!.add(socket);
      
      // Thiết lập dọn dẹp khi đóng kết nối
      socket.on('close', () => {
        const sockets = userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket);
          if (sockets.size === 0) {
            userSockets.delete(userId);
          }
        }
      });
      
      // Lắng nghe dữ liệu (nếu client gửi ping hoặc data, tránh rò rỉ bộ nhớ hoặc ngắt kết nối)
      socket.on('data', (data) => {
        try {
          if (data.length > 0 && (data[0] & 0x0F) === 0x09) {
            // Phản hồi Pong frame khi nhận Ping
            const pong = Buffer.alloc(2);
            pong[0] = 0x8a;
            pong[1] = 0x00;
            socket.write(pong);
          }
        } catch (e) {
          // Bỏ qua lỗi ghi socket hỏng
        }
      });
      
    } catch (err) {
      socket.destroy();
    }
  });
}

export function sendNotificationRealtime(userId: string, notification: any) {
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) return;
  
  const payloadStr = JSON.stringify({ type: 'notification', data: notification });
  const payload = Buffer.from(payloadStr, 'utf-8');
  const len = payload.length;
  let header: Buffer;
  
  if (len <= 125) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = len;
  } else if (len <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  
  const frame = Buffer.concat([header, payload]);
  
  for (const socket of sockets) {
    try {
      socket.write(frame);
    } catch (err) {
      // Bỏ qua lỗi socket hỏng
    }
  }
}
