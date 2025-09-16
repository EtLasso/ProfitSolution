FROM nginx:alpine
# Nginx conf: gzip + caching + index
RUN apk add --no-cache bash \
 && printf '%s\n' \
 'server {' \
 '  listen 80;' \
 '  server_name _;' \
 '  gzip on;' \
 '  gzip_types text/plain text/css application/javascript application/json image/svg+xml;' \
 '  root /usr/share/nginx/html;' \
 '  index index.html;' \
 '  location / {' \
 '    try_files $uri $uri/ /index.html;' \
 '  }' \
 '}' > /etc/nginx/conf.d/default.conf
COPY public/ /usr/share/nginx/html/
