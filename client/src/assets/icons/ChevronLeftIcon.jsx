export default function ChevronLeftIcon({ width = 24, height = 24, className = '', ...props }) {
    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <path d="M15 18L9 12L15 6" />
        </svg>
    );
}
