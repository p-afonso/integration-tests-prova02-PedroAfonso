import pactum from 'pactum';

const baseUrl = 'https://restful-booker.herokuapp.com';
pactum.request.setDefaultTimeout(45000);
pactum.request.setDefaultHeaders('Accept', 'application/json');

describe('Restful-Booker: ciclo de uma reserva', () => {
  it('cria, consulta, atualiza e confirma uma reserva', async () => {
    const original = {
      firstname: 'Pedro',
      lastname: 'Teste',
      totalprice: 180,
      depositpaid: true,
      bookingdates: { checkin: '2027-01-10', checkout: '2027-01-12' },
      additionalneeds: 'Breakfast'
    };
    const updated = {
      ...original,
      totalprice: 240,
      additionalneeds: 'Late checkout'
    };

    const created = await pactum
      .spec()
      .post(`${baseUrl}/booking`)
      .withHeaders('Accept', 'application/json')
      .withJson(original)
      .expectStatus(200)
      .expectJsonLike({ booking: original })
      .returns('bookingid');

    expect(typeof created).toBe('number');
    await pactum
      .spec()
      .get(`${baseUrl}/booking/${created}`)
      .withHeaders('Accept', 'application/json')
      .expectStatus(200)
      .expectJsonLike(original);

    const token = await pactum
      .spec()
      .post(`${baseUrl}/auth`)
      .withJson({ username: 'admin', password: 'password123' })
      .expectStatus(200)
      .returns('token');
    expect(token).toEqual(expect.any(String));

    await pactum
      .spec()
      .put(`${baseUrl}/booking/${created}`)
      .withHeaders('Accept', 'application/json')
      .withHeaders('Cookie', `token=${token}`)
      .withJson(updated)
      .expectStatus(200)
      .expectJsonLike(updated);

    await pactum
      .spec()
      .get(`${baseUrl}/booking/${created}`)
      .withHeaders('Accept', 'application/json')
      .expectStatus(200)
      .expectJsonLike(updated);
  }, 120000);
});

// Cada teste que altera dados cria sua própria reserva.
// Credenciais públicas de demonstração documentadas pela Restful-Booker.
describe('Restful-Booker: consultas, segurança e alterações', () => {
  let token: string;
  let bookingId: number | undefined;
  const booking = {
    firstname: 'Pedro',
    lastname: `Prova${Date.now()}`,
    totalprice: 200,
    depositpaid: false,
    bookingdates: { checkin: '2027-02-10', checkout: '2027-02-12' },
    additionalneeds: 'Breakfast'
  };

  const createBooking = async () => {
    bookingId = await pactum
      .spec()
      .post(`${baseUrl}/booking`)
      .withJson(booking)
      .expectStatus(200)
      .returns('bookingid');
    return bookingId;
  };

  beforeAll(async () => {
    token = await pactum
      .spec()
      .post(`${baseUrl}/auth`)
      .withJson({ username: 'admin', password: 'password123' })
      .expectStatus(200)
      .returns('token');
    expect(token).toEqual(expect.any(String));
  }, 60000);

  afterEach(async () => {
    if (bookingId !== undefined) {
      await pactum
        .spec()
        .delete(`${baseUrl}/booking/${bookingId}`)
        .withHeaders('Cookie', `token=${token}`)
        .expectStatus(201);
      bookingId = undefined;
    }
  }, 60000);

  it('GET: encontra uma reserva pelo nome e sobrenome', async () => {
    const id = await createBooking();
    const results = await pactum
      .spec()
      .get(`${baseUrl}/booking`)
      .withQueryParams({
        firstname: booking.firstname,
        lastname: booking.lastname
      })
      .expectStatus(200)
      .returns('');
    expect(results).toContainEqual({ bookingid: id });
  }, 120000);

  it('GET: retorna 404 para uma reserva inexistente', async () => {
    await pactum.spec().get(`${baseUrl}/booking/2147483647`).expectStatus(404);
  }, 60000);

  it('POST: valida o contrato JSON de uma nova reserva', async () => {
    bookingId = await pactum
      .spec()
      .post(`${baseUrl}/booking`)
      .withJson(booking)
      .expectStatus(200)
      .expectJsonSchema({
        type: 'object',
        required: ['bookingid', 'booking'],
        properties: {
          bookingid: { type: 'integer' },
          booking: {
            type: 'object',
            required: [
              'firstname',
              'lastname',
              'totalprice',
              'depositpaid',
              'bookingdates'
            ],
            properties: {
              firstname: { type: 'string' },
              lastname: { type: 'string' },
              totalprice: { type: 'integer' },
              depositpaid: { type: 'boolean' },
              bookingdates: {
                type: 'object',
                required: ['checkin', 'checkout'],
                properties: {
                  checkin: { type: 'string' },
                  checkout: { type: 'string' }
                }
              }
            }
          }
        }
      })
      .expectJsonLike({ booking })
      .returns('bookingid');
  }, 60000);

  it('POST auth: recusa credenciais inválidas sem emitir token', async () => {
    const response = await pactum
      .spec()
      .post(`${baseUrl}/auth`)
      .withJson({ username: 'invalid-user', password: 'invalid-password' })
      .expectStatus(200)
      .expectJsonLike({ reason: 'Bad credentials' })
      .returns('');
    expect(response).not.toHaveProperty('token');
  }, 60000);

  it('PUT: bloqueia alteração sem autenticação e mantém os dados', async () => {
    const id = await createBooking();
    await pactum
      .spec()
      .put(`${baseUrl}/booking/${id}`)
      .withJson({ ...booking, totalprice: 999 })
      .expectStatus(403);
    await pactum
      .spec()
      .get(`${baseUrl}/booking/${id}`)
      .expectStatus(200)
      .expectJsonLike(booking);
  }, 120000);

  it('PATCH: altera o preço e preserva os demais campos', async () => {
    const id = await createBooking();
    await pactum
      .spec()
      .patch(`${baseUrl}/booking/${id}`)
      .withHeaders('Cookie', `token=${token}`)
      .withJson({ totalprice: 350 })
      .expectStatus(200)
      .expectJsonLike({ ...booking, totalprice: 350 });
    await pactum
      .spec()
      .get(`${baseUrl}/booking/${id}`)
      .expectStatus(200)
      .expectJsonLike({ ...booking, totalprice: 350 });
  }, 120000);

  it('DELETE: exclui a reserva e confirma 404 na consulta seguinte', async () => {
    const id = await createBooking();
    await pactum
      .spec()
      .delete(`${baseUrl}/booking/${id}`)
      .withHeaders('Cookie', `token=${token}`)
      .expectStatus(201);
    bookingId = undefined;
    await pactum.spec().get(`${baseUrl}/booking/${id}`).expectStatus(404);
  }, 120000);
});
