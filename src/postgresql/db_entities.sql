-- Naming convensions must be done!
CREATE TABLE
	IF NOT EXISTS Users (
		user_id SERIAL PRIMARY KEY,
		nickname VARCHAR(50) UNIQUE NOT NULL,
		-- status ENUM ('online', 'offline', 'ingame') DEFAULT 'offline',
		greeting VARCHAR(50) DEFAULT 'Hello, I have just landed!',
		authkey VARCHAR(50) DEFAULT NULL,
		profile_photo VARCHAR(50) DEFAULT 'default_profile_photo.png',
		time_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		intra_name VARCHAR(50),
		intra_surname VARCHAR(50),
		intra_email VARCHAR(50),
	);

CREATE TABLE
	IF NOT EXISTS Friends (
		status ENUM ('pending', 'accepted', 'blocked'),
		PRIMARY KEY (lower_id, higher_id),
		FOREIGN KEY (lower_id) REFERENCES Users (user_id),
		FOREIGN KEY (higher_id) REFERENCES Users (user_id),
	);

CREATE TABLE IF NOT EXISTS GameHistory (
  id SERIAL PRIMARY KEY,
  player1Score INTEGER NOT NULL,
  player2Score INTEGER NOT NULL,
  winner BOOLEAN NOT NULL,
  player1_id INTEGER,
  player2_id INTEGER,
  FOREIGN KEY (player1_id) REFERENCES Users (user_id),
  FOREIGN KEY (player2_id) REFERENCES Users (user_id)
);

-- Think about dynamic tables f.e. table for every channel like: Channel_id_Members
CREATE TABLE
	IF NOT EXISTS Channels (
		channel_id SERIAL PRIMARY KEY,
		status ENUM ('public', 'protected', 'private', 'chat'),
		title VARCHAR(50) DEFAULT 'Welcome to my Channel!',
		channel_photo VARCHAR(50) DEFAULT 'default_channel_photo.png',
		created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	);

CREATE TABLE
	IF NOT EXISTS Channel_Members (
		PRIMARY KEY (channel_id, user_id),
		FOREIGN KEY (user_id) REFERENCES Users (user_id),
		FOREIGN KEY (channel_id) REFERENCES Channels (channel_id),
		role ENUM ('owner', 'admin', 'member') DEFAULT 'member',
	);

CREATE TABLE
	IF NOT EXISTS Messages (
		msg_id SERIAL PRIMARY KEY,
		FOREIGN KEY (sender_id) REFERENCES Users (user_id),
		FOREIGN KEY (receiver_id) REFERENCES Channels (channel_id),
		content TEXT NOT NULL,
		time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	);
