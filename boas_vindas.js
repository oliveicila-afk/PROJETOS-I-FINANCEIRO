console.clear();

const dataDeHoje = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'full',
}).format(new Date());

console.log(`Bem-vindo(a)! Hoje é ${dataDeHoje}.`);
