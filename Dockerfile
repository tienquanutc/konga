FROM node:12.16-alpine

COPY . /app

WORKDIR /app

# The `sed`/`chmod` on *.sh below: a Windows checkout hands the shell scripts
# over with CRLF endings, and the kernel then cannot run the ENTRYPOINT at all
# (`exec /app/start.sh: no such file or directory`). Normalizing them at build
# time makes the image correct no matter how the source was checked out.
RUN apk upgrade --update \
    && apk add bash git ca-certificates \
    && sed -i 's/\r$//' /app/*.sh \
    && chmod +x /app/*.sh \
    && npm install -g bower \
    && npm --unsafe-perm --production install \
    && apk del git \
    && rm -rf /var/cache/apk/* \
        /app/.git \
        /app/screenshots \
        /app/test \
    && adduser -H -S -g "Konga service owner" -D -u 1200 -s /sbin/nologin konga \
    && mkdir -p /app/kongadata /app/.tmp \
    && chown -R 1200:1200 /app/views /app/kongadata /app/.tmp

EXPOSE 1337

VOLUME /app/kongadata

ENTRYPOINT ["/app/start.sh"]
