// Foto do produto; enquanto um produto não tem foto, mostra um quadro com o nome.
export default function ProductPhoto({ product, className }) {
  if (product.image) return <img className={className} src={product.image} alt={product.name} loading="lazy" />;
  return (
    <div className={`${className} photo-missing`} role="img" aria-label={product.name}>
      <span>{product.name}</span>
    </div>
  );
}
