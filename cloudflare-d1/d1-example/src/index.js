import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono();

app.use('/api/*', cors());

app.get('/api/posts/:slug/comments', async c => {

	const { slug } = c.req.param(); // guardar el slug del parametro

	const { results } = await c.env.DB.prepare(` 
		select * from comments where post_slug = ?
	`).bind(slug).all();

	return c.json(results);
})

app.post('/api/posts/:slug/comments', async c => {
	const { slug } = c.req.param();

	const { author, body } = await c.req.json(); // recuperar los datos de body por destructuring

	if (!author || !body) {
		return c.text('faltan datos')
	}


	const { success } = await c.env.DB.prepare(`
		insert into comments (author, body, post_slug) values(?,?,?)
		`).bind(author, body, slug).run();

	if (success) {
		c.status(201)
		return c.text('creado')
	} else {
		c.status(500)
		return c.text('error')
	}

});

export default app;