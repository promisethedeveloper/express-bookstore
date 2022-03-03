process.env.NODE_ENV = "test";
const request = require("supertest");
const { response } = require("../app");
const app = require("../app");
const db = require("../db");

let book_isbn;

beforeEach(async () => {
	let result = await db.query(`
        INSERT INTO books 
            (isbn, amazon_url, author, language, pages, publisher, title, year)
            VALUES(
                '12345678', 
                'http://amazon-sample.com', 
                'Ben Davis',
                'english', 200,
                'Oloye publishers',
                'Get stronger', 2010) RETURNING isbn`);

	book_isbn = result.rows[0].isbn;
});

describe("POST /books", function () {
	test("Should create a new book", async () => {
		const response = await request(app).post("/books").send({
			isbn: "98675634",
			amazon_url: "https://amazon-testing.com",
			author: "Kennedy Brown",
			language: "english",
			pages: 300,
			publisher: "Princeton piblisher",
			title: "Eat a little less, exercise a little more",
			year: 2020,
		});
		expect(response.statusCode).toBe(201);
		expect(response.body.book).toHaveProperty("isbn");
	});

	test("Should prevent the creation of a book without an author name", async () => {
		const response = await request(app).post("/books").send({
			isbn: "98675634",
			amazon_url: "https://amazon-testing.com",
			language: "english",
			pages: 300,
			publisher: "Princeton piblisher",
			title: "Eat a little less, exercise a little more",
			year: 2020,
		});
		expect(response.statusCode).toBe(400);
	});
});

describe("GET /books", function () {
	test("Should return all books", async () => {
		const response = await request(app).get("/books");
		const books = response.body.books;
		expect(response.statusCode).toBe(200);
		expect(books).toHaveLength(1);
		expect(books[0]).toHaveProperty("author");
	});
});

describe("GET /book/:isbn", function () {
	test("Should return a single book", async () => {
		const response = await request(app).get(`/books/${book_isbn}`);
		expect(response.body.book).toHaveProperty("author");
		expect(response.body.book.isbn).toBe(book_isbn);
	});

	test("Should return 404 if book is not found", async function () {
		const response = await request(app).get(`/books/25364783`);
		expect(response.statusCode).toBe(404);
	});
});

describe("PUT /book/:isbn", () => {
	test("Should edit book", async function () {
		const response = await request(app).put(`/books/${book_isbn}`).send({
			amazon_url: "https://taco.com",
			author: "Tester",
			language: "english",
			pages: 500,
			publisher: "top publisher",
			title: "Never give up",
			year: 2000,
		});
		expect(response.body.book).toHaveProperty("author");
		expect(response.body.book.title).toBe("Never give up");
	});

	test("Should return 404 when trying to update an unknown book", async () => {
		const response = await request(app).put("/books/46573846").send({
			amazon_url: "https://abc.com",
			author: "Checker",
			language: "english",
			pages: 400,
			publisher: "Main publisher",
			title: "Keep going",
			year: 2000,
		});
		expect(response.statusCode).toBe(404);
	});

	test("Prevents a bad book update", async function () {
		const response = await request(app).put(`/books/${book_isbn}`).send({
			isbn: "32794782",
			badField: "DO NOT ADD ME!",
			amazon_url: "https://xyz.com",
			author: "Tester",
			language: "english",
			pages: 1000,
			publisher: "yeah right",
			title: "UPDATED BOOK",
			year: 2000,
		});
		expect(response.statusCode).toBe(400);
	});
});

describe("DELETE /books/:isbn", function () {
	test("Should delete a particular book", async function () {
		const response = await request(app).delete(`/books/${book_isbn}`);
		expect(response.body).toEqual({ message: "Book deleted" });
	});
});

afterEach(async function () {
	await db.query("DELETE FROM BOOKS");
});

afterAll(async function () {
	await db.end();
});
