import { Link } from '@inertiajs/react';

export default function Layout({ children }) {
    return (
        <div className="min-h-screen bg-gray-100">
            {/* Navigation */}
            <nav className="bg-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link href="/" className="flex items-center">
                            <span className="text-2xl font-bold text-gray-800">Stock Database</span>
                        </Link>
                        <div className="flex space-x-4">
                            <Link
                                href={route('stocks.index')}
                                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Stocks
                            </Link>
                            <Link
                                href={route('stocks.create')}
                                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Add Stock
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main>{children}</main>

            {/* Footer */}
            <footer className="bg-white mt-12 border-t border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <p className="text-center text-gray-600 text-sm">
                        &copy; 2026 Stock Database. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
