import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface SidebarItem {
    name: string;
    href: string;
    icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
    subItems?: { name: string; href: string }[];
}

interface SidebarProps {
    items: SidebarItem[];
    isOpen?: boolean;
    onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    items,
    isOpen = true,
    onClose
}) => {
    const router = useRouter();
    const [openSubMenu, setOpenSubMenu] = React.useState<string | null>(null);

    const isActive = (href: string) => {
        return router.pathname === href || router.pathname.startsWith(`${href}/`);
    };

    const toggleSubMenu = (name: string) => {
        setOpenSubMenu(prev => prev === name ? null : name);
    };

    return (
        <>
            {/* Mobile backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-20 bg-gray-600 bg-opacity-75 lg:hidden"
                    onClick={onClose}
                ></div>
            )}

            {/* Sidebar */}
            <div
                className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transition-transform duration-300 transform lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Sidebar header */}
                    <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                        <Link href="/">
                            <span className="text-blue-600 font-bold text-xl">INVEST</span>
                        </Link>
                        <button
                            type="button"
                            className="lg:hidden text-gray-500 hover:text-gray-600"
                            onClick={onClose}
                        >
                            <span className="sr-only">Close sidebar</span>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Sidebar content */}
                    <div className="flex-1 overflow-y-auto">
                        <nav className="px-2 py-4 space-y-1">
                            {items.map((item) => (
                                <div key={item.name}>
                                    {item.subItems ? (
                                        <>
                                            <button
                                                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive(item.href)
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                onClick={() => toggleSubMenu(item.name)}
                                            >
                                                <item.icon
                                                    className={`mr-3 h-5 w-5 ${isActive(item.href) ? 'text-blue-500' : 'text-gray-500'
                                                        }`}
                                                    aria-hidden="true"
                                                />
                                                <span className="flex-1 text-left">{item.name}</span>
                                                <svg
                                                    className={`h-4 w-4 transition-transform ${openSubMenu === item.name ? 'transform rotate-90' : ''
                                                        }`}
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                            {openSubMenu === item.name && (
                                                <div className="mt-1 pl-8 space-y-1">
                                                    {item.subItems.map((subItem) => (
                                                        <Link href={subItem.href} key={subItem.name}>
                                                            <span
                                                                className={`block py-2 pl-3 pr-4 text-sm rounded-md ${isActive(subItem.href)
                                                                        ? 'bg-blue-50 text-blue-700'
                                                                        : 'text-gray-700 hover:bg-gray-50'
                                                                    }`}
                                                            >
                                                                {subItem.name}
                                                            </span>
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <Link href={item.href}>
                                            <span
                                                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive(item.href)
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'text-gray-700 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <item.icon
                                                    className={`mr-3 h-5 w-5 ${isActive(item.href) ? 'text-blue-500' : 'text-gray-500'
                                                        }`}
                                                    aria-hidden="true"
                                                />
                                                {item.name}
                                            </span>
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </nav>
                    </div>

                    {/* Sidebar footer */}
                    <div className="flex-shrink-0 border-t border-gray-200 p-4">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="text-blue-600 font-medium text-sm">US</span>
                                </div>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-700">User Settings</p>
                                <Link href="/settings">
                                    <span className="text-xs font-medium text-gray-500 hover:text-gray-700">
                                        View settings
                                    </span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;