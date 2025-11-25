FROM postgres:15

# Copy all initialization SQL files into the container
# These will be executed automatically in alphabetical order
COPY init/*.sql /docker-entrypoint-initdb.d/

# Set proper permissions
RUN chmod 644 /docker-entrypoint-initdb.d/*.sql
