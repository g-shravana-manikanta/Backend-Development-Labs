const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
app.use(express.json());
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "bookstore.db");
let db = null;
const PORT = process.env.PORT || 3000;
const jwtSecret = "MY_SECRET_KEY_123";

const initializeDBAndServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        console.log("Database connected successfully");

        app.listen(PORT, () => {
            console.log(`Server Running at http://localhost:${PORT}/`);
        });

    } catch (e) {
        console.error(`Error initializing database or server: ${e.message}`);
        process.exit(1);
    }
};

app.post("/register/", async (request, response) => {
  try {
    const { username, name, password } = request.body;

    if (!username || !name || !password) {
      return response.status(400).send({
        message: "Username, name and password are required",
      });
    }

    const selectUserQuery = `
      SELECT *
      FROM users
      WHERE username = ?;
    `;

    const dbUser = await db.get(selectUserQuery, [username]);

    if (dbUser !== undefined) {
      return response.status(400).send({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createUserQuery = `
      INSERT INTO users (username, name, password)
      VALUES (?, ?, ?);
    `;

    await db.run(createUserQuery, [
      username,
      name,
      hashedPassword,
    ]);

    response.status(200).send({
      message: "User created successfully",
    });

  } catch (e) {
    console.error(`Registration error: ${e.message}`);
    response.status(500).send({
      message: "Unable to register user",
    });
  }
});

initializeDBAndServer();

app.post("/login/", async (request, response) => {
  try {
    const { username, password } = request.body;

    if (!username || !password) {
      return response.status(400).send({
        message: "Username and password are required",
      });
    }

    const selectUserQuery = `
      SELECT *
      FROM users
      WHERE username = ?;
    `;

    const dbUser = await db.get(selectUserQuery, [username]);

    if (dbUser === undefined) {
      return response.status(400).send({
        message: "Invalid user",
      });
    }

    const isPasswordMatched = await bcrypt.compare(
      password,
      dbUser.password
    );

    if (!isPasswordMatched) {
      return response.status(400).send({
        message: "Invalid password",
      });
    }

    const payload = {
      username: username,
    };

    const jwtToken = jwt.sign(payload, jwtSecret);

    response.status(200).send({
      jwt_token: jwtToken,
    });

  } catch (e) {
    console.error(`Login error: ${e.message}`);
    response.status(500).send({
      message: "Unable to login",
    });
  }
});

app.get("/books/", async (request, response) => {
  const {
    offset = 0,
    limit = 10,
    order = "ASC",
    order_by = "id",
    search_q = "",
    min_price = 0,
    max_price = 100000,} = request.query;

  const getBooksQuery = `
    SELECT *
    FROM book
    WHERE title LIKE ?
    AND price BETWEEN ? AND ?
    ORDER BY ${order_by} ${order}
    LIMIT ? OFFSET ?;`;

  const booksArray = await db.all(getBooksQuery, [
    `%${search_q}%`,
    Number(min_price),
    Number(max_price),
    Number(limit),
    Number(offset),
  ]);

  response.status(200).send(booksArray);
});

app.get("/books/:bookId/", async (request, response) => {
  const { bookId } = request.params;
  const getBookQuery = `
    SELECT *
    FROM book
    WHERE id = ?;`;
  const book = await db.get(getBookQuery, [bookId]);
  response.send(book);
});

app.post("/books/", async (request, response) => {
  const bookDetails = request.body;
  const {
    title,
    author,
    price,
    pages,
  } = bookDetails;
  const addBookQuery = `
    INSERT INTO
      book (title, author, price, pages)
    VALUES
      (
       ?, ?, ?, ?
      );`

  const dbResponse = await db.run(addBookQuery, [title, author, price, pages]);
  const bookId = dbResponse.lastID;
  response.status(201).send({ bookId: bookId });
});

app.put("/books/:bookId/", async (request, response) => {
    const { bookId } = request.params;
    const bookDetails = request.body;
    const { title, author, price, pages } = bookDetails;
    const updateBookQuery = `
        UPDATE book
        SET
            title = ?,
            author = ?,
            price = ?,
            pages = ?
        WHERE 
            id = ?;`
    await db.run(updateBookQuery, [
        title,
        author,
        price,
        pages,
        bookId
    ]);
    response.send("Book updated successfully");
});

app.delete("/books/:bookId/", async (request, response) => {
    const { bookId } = request.params;
    const deleteBookQuery = `
        DELETE FROM book
        WHERE id = ?;`
    await db.run(deleteBookQuery, [bookId]);
    response.send("Book deleted successfully");
});