"use client";

import { useState, RefObject } from "react";
import { jsPDF } from "jspdf";
import { Download, FileImage, Loader2 } from "lucide-react";

interface PosterDownloadButtonsProps {
    targetRef: RefObject<HTMLElement | null>;
    filename?: string;
}

// A1 사이즈 (mm)
const A1_WIDTH_MM = 594;
const A1_HEIGHT_MM = 841;

// A1 @ 300 DPI (pixels)
const A1_WIDTH_PX_300DPI = 7016;
const A1_HEIGHT_PX_300DPI = 9933;

export function PosterDownloadButtons({
    targetRef,
    filename = "EUM_Poster_A1",
}: PosterDownloadButtonsProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadType, setDownloadType] = useState<"pdf" | "png" | null>(null);

    const captureElement = async (): Promise<string | null> => {
        if (!targetRef.current) {
            console.error("Target element not found");
            return null;
        }

        const { domToPng } = await import("modern-screenshot");

        const element = targetRef.current;
        const elementHeight = element.offsetHeight;

        // A1 300 DPI에 맞는 정확한 스케일 계산
        const scale = A1_HEIGHT_PX_300DPI / elementHeight;

        // modern-screenshot 사용 (oklab 등 현대 CSS 지원)
        const dataUrl = await domToPng(element, {
            scale,
            backgroundColor: "#000000",
        });

        return dataUrl;
    };

    const downloadAsPNG = async () => {
        setIsDownloading(true);
        setDownloadType("png");

        try {
            const dataUrl = await captureElement();
            if (!dataUrl) return;

            const link = document.createElement("a");
            link.download = `${filename}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error("PNG 다운로드 실패:", error);
            alert("다운로드에 실패했습니다. 다시 시도해주세요.");
        } finally {
            setIsDownloading(false);
            setDownloadType(null);
        }
    };

    const downloadAsPDF = async () => {
        setIsDownloading(true);
        setDownloadType("pdf");

        try {
            const dataUrl = await captureElement();
            if (!dataUrl) return;

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: [A1_WIDTH_MM, A1_HEIGHT_MM],
            });

            pdf.addImage(dataUrl, "PNG", 0, 0, A1_WIDTH_MM, A1_HEIGHT_MM);
            pdf.save(`${filename}.pdf`);
        } catch (error) {
            console.error("PDF 다운로드 실패:", error);
            alert("다운로드에 실패했습니다. 다시 시도해주세요.");
        } finally {
            setIsDownloading(false);
            setDownloadType(null);
        }
    };

    return (
        <div className="flex gap-2">
            <button
                onClick={downloadAsPNG}
                disabled={isDownloading}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isDownloading && downloadType === "png" ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : (
                    <FileImage size={16} />
                )}
                PNG
            </button>

            <button
                onClick={downloadAsPDF}
                disabled={isDownloading}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-200 text-black text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isDownloading && downloadType === "pdf" ? (
                    <Loader2 size={16} className="animate-spin text-black" />
                ) : (
                    <Download size={16} />
                )}
                PDF (A1)
            </button>
        </div>
    );
}
