#!/bin/bash

# Counter Web Application Server Setup Script
# Run this script on your server to install and configure the application

set -e

echo "=== Counter Web Application Server Setup ==="

# Update system
echo "Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install Node.js and npm
echo "Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install nginx
echo "Installing nginx..."
sudo apt install nginx -y

# Create application directory
echo "Creating application directory..."
sudo mkdir -p /var/www/counter-web
sudo chown -R $USER:$USER /var/www/counter-web

# Copy application files (assuming you're running this from the project directory)
echo "Copying application files..."
cp -r public/* /var/www/counter-web/
cp package.json /var/www/counter-web/
cp package-lock.json /var/www/counter-web/

# Install dependencies
echo "Installing application dependencies..."
cd /var/www/counter-web
npm install --production

# Create systemd service
echo "Creating systemd service..."
sudo tee /etc/systemd/system/counter-web.service > /dev/null <<EOF
[Unit]
Description=Counter Web Application
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/var/www/counter-web
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Create nginx configuration
echo "Creating nginx configuration..."
sudo tee /etc/nginx/sites-available/counter-web > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain
    
    location / {
        proxy_pass http://localhost:39245;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable nginx site
echo "Enabling nginx site..."
sudo ln -sf /etc/nginx/sites-available/counter-web /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "Testing nginx configuration..."
sudo nginx -t

# Start and enable services
echo "Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable counter-web
sudo systemctl start counter-web
sudo systemctl restart nginx

# Check service status
echo "Checking service status..."
sudo systemctl status counter-web --no-pager
sudo systemctl status nginx --no-pager

echo "=== Setup Complete ==="
echo "Your application should be running at:"
echo "- Local: http://localhost"
echo "- External: http://your-server-ip"
echo ""
echo "To check logs: sudo journalctl -u counter-web -f"
echo "To restart: sudo systemctl restart counter-web"