import pactum from 'pactum';

const baseUrl = 'https://restful-booker.herokuapp.com';
pactum.request.setDefaultTimeout(45000);

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
    const updated = { ...original, totalprice: 240, additionalneeds: 'Late checkout' };

    const created = await pactum.spec()
      .post(`${baseUrl}/booking`)
      .withHeaders('Accept', 'application/json')
      .withJson(original)
      .expectStatus(200)
      .expectJsonLike({ booking: original })
      .returns('bookingid');

    expect(typeof created).toBe('number');
    await pactum.spec()
      .get(`${baseUrl}/booking/${created}`)
      .withHeaders('Accept', 'application/json')
      .expectStatus(200)
      .expectJsonLike(original);

    const token = await pactum.spec()
      .post(`${baseUrl}/auth`)
      .withJson({ username: 'admin', password: 'password123' })
      .expectStatus(200)
      .returns('token');
    expect(token).toEqual(expect.any(String));

    await pactum.spec()
      .put(`${baseUrl}/booking/${created}`)
      .withHeaders('Accept', 'application/json')
      .withHeaders('Cookie', `token=${token}`)
      .withJson(updated)
      .expectStatus(200)
      .expectJsonLike(updated);

    await pactum.spec()
      .get(`${baseUrl}/booking/${created}`)
      .withHeaders('Accept', 'application/json')
      .expectStatus(200)
      .expectJsonLike(updated);
  }, 120000);
});
