worker_processes  2;

events {
    worker_connections  2048;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;

    keepalive_timeout 65;
    keepalive_requests 1000;

    client_max_body_size 50M;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 5;

    gzip_types
        application/json
        application/javascript
        application/xml
        text/css
        text/plain;

    upstream backend {
        server 127.0.0.1:5000;
        keepalive 32;
    }

    server {
        listen 80;
        server_name procurement.moa.gov.et;

        location / {
            proxy_pass http://backend;

            proxy_http_version 1.1;

            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            proxy_set_header Connection "";

            proxy_connect_timeout 10s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;

            proxy_buffering on;
            proxy_buffer_size 16k;
            proxy_buffers 8 16k;
        }
    }
}