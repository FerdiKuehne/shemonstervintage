FROM php:8.2-cli

# Install dependencies for GD and PDO MySQL
RUN apt-get update && apt-get install -y \
    default-mysql-client \
    libmariadb-dev \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    libwebp-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install gd pdo_mysql

WORKDIR /var/www/api
