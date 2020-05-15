# NodeJS 12 버전을 사용한다.
FROM node:12

# 컨테이너 내, 기준 디렉토리를 설정한다.
WORKDIR /usr/app

# 프로젝트를 복사한다.
COPY ./server ./server

# 스크립트에 실행권한을 부여한다.
COPY ./start.sh ./start.sh
RUN chmod +x ./start.sh
CMD ["bash"]