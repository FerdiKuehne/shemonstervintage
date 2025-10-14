FROM php:8.2-cli

# Install PDO MySQL dependencies
RUN apt-get update && apt-get install -y \
    default-mysql-client \
    libmariadb-dev \
    && docker-php-ext-install pdo_mysql

WORKDIR /var/www/api

# Optional: copy PHP code into container
# COPY ./api /var/www/api
