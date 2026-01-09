export const PEN_COLORS = [
    '#000000', '#444444', '#666666', '#999999', '#CCCCCC', '#EEEEEE', '#FFFFFF',
    '#FFCCCC', '#FFE5CC', '#F9FFCC', '#CCFFEB', '#CCECFF', '#CCCCFF', '#E5CCFF',
    '#FF9966', '#FFCC00', '#B2CC47', '#80C2C0', '#66B2FF', '#9999FF', '#CC66FF',
    '#FF5050', '#FF9933', '#8CB347', '#40B2A9', '#3399FF', '#6666FF', '#9933FF',
    '#CC3300', '#FF6600', '#5F8C3E', '#209688', '#007ACC', '#3333CC', '#6600CC',
    '#992600', '#CC5200', '#40662E', '#146E5E', '#005299', '#24248F', '#47008F'
];

export const TOOL_SETTINGS = {
    pen: {
        minSize: 1,
        maxSize: 20,
        defaultSize: 2,
    },
    eraser: {
        minSize: 5,
        maxSize: 100,
        defaultSize: 20,
    },
    smoothness: {
        min: 0,
        max: 10,
        default: 7,
    },
};

export const ZOOM_SETTINGS = {
    min: 0.1,
    max: 5,
    step: 0.2,
    default: 1,
};

export const GRID_SETTINGS = {
    baseSize: 24,
    dotSize: 2.5,
    dotColor: '#999999',
};
