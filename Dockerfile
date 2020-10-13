FROM node:10-alpine
WORKDIR /opt/eostracker
COPY . /opt/eostracker
RUN yarn

EXPOSE 8080
CMD ["yarn", "start"]
