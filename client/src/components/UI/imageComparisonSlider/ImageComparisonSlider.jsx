import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './ImageComparisonSlider.module.css';

export default function ImageComparisonSlider({ beforeImage, afterImage, alt = 'Comparison' }) {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef(null);

    const handleMove = useCallback((clientX) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = (x / rect.width) * 100;

        setSliderPosition(Math.min(Math.max(percentage, 0), 100));
    }, []);

    const handleMouseDown = () => {
        setIsDragging(true);
    };

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMouseMove = useCallback((e) => {
        handleMove(e.clientX);
    }, [handleMove]);

    const handleTouchMove = useCallback((e) => {
        handleMove(e.touches[0].clientX);
    }, [handleMove]);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

    return (
        <div
            ref={containerRef}
            className={styles.comparisonContainer}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
        >
            <div className={styles.imageWrapper}>
                <img
                    src={afterImage}
                    alt={`${alt} - After`}
                    className={styles.imageAfter}
                    draggable="false"
                />

                <div
                    className={styles.imageBeforeWrapper}
                    style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                >
                    <img
                        src={beforeImage}
                        alt={`${alt} - Before`}
                        className={styles.imageBefore}
                        draggable="false"
                    />
                </div>
            </div>

            <div
                className={styles.slider}
                style={{ left: `${sliderPosition}%` }}
            >
                <div className={styles.sliderButton}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div className={styles.sliderLine} />
            </div>

            <div className={styles.labels}>
                <span className={styles.labelBefore}>Before</span>
                <span className={styles.labelAfter}>After</span>
            </div>
        </div>
    );
}
