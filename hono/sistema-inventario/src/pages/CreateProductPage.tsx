import { useProducts } from '../hooks/useProducts'
import { PageHeader } from '../components/ui/PageHeader'
import { ProductCatalog } from '../components/products/ProductCatalog'
import { ProductForm } from '../components/products/ProductForm'

export function CreateProductPage() {
  const { products, loading, error, reload } = useProducts()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catálogo"
        title="Nuevo producto"
        description="Crea un SKU para poder registrar entradas, salidas y traslados."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <ProductForm onCreated={() => void reload()} />
        <ProductCatalog products={products} loading={loading} error={error} />
      </div>
    </div>
  )
}
