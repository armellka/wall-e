# Instructions

  * Clone this repository
  
  * Install NodeJS (apt-get install nodejs)
  
  * Install dependency (npm install)
  
  * Launch the server (node server.js)
  
  * [See Wall-e in action](http://localhost:8081 "Test Wall-e")

# Instructions with Docker

  * Get this repository
  * Go into
  * Launch this:

    docker build -t walle .

  * It will take some time. Then launch this:

    docker run -d -p 8081:8081 --name walle walle /usr/bin/supervisord

  * Finally access to the web with the next link: [See Wall-e in action](http://localhost:8081 "Test Wall-e")

You will have the last version of Wall-e, the Collaborative whiteboard.


