# Stage Controller

Preact + Vite web controller for ENTTEC ELM (LED Mapper).
Runs on a Windows PC alongside ELM, accessed from iPads over WiFi.

## Windows PC Setup (production)

### Prerequisites
- Node.js installed (https://nodejs.org — LTS version)
- ELM running on the same machine (port 8057)

### Install
```
git clone https://github.com/YOUR_USERNAME/stage-controller.git
cd stage-controller
npm install
npm run build
```

### Run
Double-click `serve.bat` or:
```
npm run serve
```

The app runs on **port 4200**. Open `http://[PC-IP]:4200` from any device on the network.

### Auto-start on boot
Put a shortcut to `serve.bat` in:
```
C:\Users\[username]\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
```

### Windows Firewall
Allow Node.js inbound on port 4200. Run in an admin PowerShell:
```
netsh advfirewall firewall add rule name="Stage Controller" dir=in action=allow protocol=TCP localport=4200
```

### Update
```
git pull
npm install
npm run build
```
Then restart `serve.bat`.

## Development (Mac)

```
npm run dev
```
Runs Vite dev server on port 4200 with hot reload. Proxy forwards `/elm/*` to the ELM server.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4200 | Server port |
| ELM_HOST | localhost | ELM server hostname |
| ELM_PORT | 8057 | ELM server port |

## Network diagram

```
Venue internet
      |
[Dedicated router] SSID: STAGE_CTRL
      |              \
   Ethernet         WiFi
      |                \
[ELM Windows PC]    [iPad]
 192.168.1.206    192.168.1.x
 :8057 (ELM)      opens :4200
 :4200 (this app)
      |
[LED controllers]
 Art-Net / sACN
```
