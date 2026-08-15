export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl">
      <div className="space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">About Luxe</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We are redefining how independent creators and premium brands connect with shoppers.
          </p>
        </div>

        <div className="aspect-video w-full rounded-2xl bg-muted overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80" 
            alt="Store interior" 
            className="w-full h-full object-cover"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              Luxe was founded with a simple goal: to provide a premium, unified platform where independent fashion brands can thrive, and where shoppers can discover unique, high-quality apparel without the clutter of fast-fashion marketplaces.
            </p>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Quality First</h2>
            <p className="text-muted-foreground leading-relaxed">
              Every seller on Luxe is vetted to ensure that the products you buy meet our strict standards for quality, sustainability, and design. We believe in buying fewer, better things that last.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
