FROM php:8.2-cli

# Install PDO MySQL dependencies
RUN apt-get update && apt-get install -y \
    default-mysql-client \
    libmariadb-dev \
    && docker-php-ext-install pdo_mysql

WORKDIR /var/www/api

FROM mysql:8.0

# Copy init SQL into the container
COPY init.sql /docker-entrypoint-initdb.d/init.sql
