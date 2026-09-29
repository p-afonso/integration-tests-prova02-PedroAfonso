# Executar e subir os testes

## Primeira vez

```powershell
git clone https://github.com/p-afonso/integration-tests-prova02-PedroAfonso.git
cd integration-tests-prova02-PedroAfonso
npm ci
npm run test:booking
```

Use Node.js 22. O comando `test:booking` executa os oito cenários da Restful-Booker. `npm test` também executa os exemplos de outras APIs presentes no template.

## Atualizar uma cópia existente

```powershell
git switch master
git pull --ff-only origin master
npm ci
```

## Fazer novas alterações

```powershell
git switch -c testes/minhas-alteracoes
# Edite test/restful_booker.spec.ts.
npm run test:booking
git add test/restful_booker.spec.ts
git commit -m "Adiciona cenarios de teste da Restful-Booker"
git push -u origin testes/minhas-alteracoes
```

No GitHub, abra um Pull Request dessa branch para `master`. O Actions testa o PR. Depois do merge, o push em `master` roda os testes e a análise SonarCloud com o secret SONAR_TOKEN já cadastrado.

O relatório HTML fica em output/report.html e é disponibilizado como booking-test-report nos artifacts da execução do Actions.

## Cenários

1. POST, GET, PUT e GET: cria, consulta, atualiza e confirma a reserva.
2. GET: busca uma reserva por nome e sobrenome.
3. GET: reserva inexistente retorna 404.
4. POST: valida tipos e campos obrigatórios do JSON.
5. POST /auth: credenciais inválidas não emitem token (a API retorna 200 com reason).
6. PUT: sem autenticação retorna 403 e preserva os dados.
7. PATCH: atualiza preço e preserva demais campos.
8. DELETE: remove e confirma 404 na consulta.

A API é pública e restaura os dados periodicamente. Cada cenário novo que modifica reservas cria o próprio registro e o limpa; falhas de rede ou resets do serviço podem afetar a execução.
