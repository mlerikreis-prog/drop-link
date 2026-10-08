function notFound(req, res) {
  res.status(404).json({ error: "Rota não encontrada" });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  const status = Number(err.status) || 500;
  res.status(status).json({
    error: status === 500 ? "Erro interno do servidor" : err.message
  });
}

module.exports = { notFound, errorHandler };
