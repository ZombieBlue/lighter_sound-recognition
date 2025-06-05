/*
 * charts for WeChat small app v1.0
 *
 * 针对微信小程序的图表库，适用于基础图表展示
 * https://github.com/xiaolin3303/wx-charts
 * 
 * 精简版本，只保留本项目使用的功能
 */

var config = {
    yAxisWidth: 15,
    yAxisSplit: 5,
    xAxisHeight: 15,
    xAxisLineHeight: 15,
    legendHeight: 15,
    yAxisTitleWidth: 15,
    padding: 12,
    columePadding: 3,
    fontSize: 10,
    dataPointShape: ['circle', 'diamond', 'triangle', 'rect'],
    colors: ['#7cb5ec', '#f7a35c', '#434348', '#90ed7d', '#f15c80', '#8085e9'],
    pieChartLinePadding: 25,
    pieChartTextPadding: 15,
    xAxisTextPadding: 3,
    titleColor: '#333333',
    titleFontSize: 20,
    subtitleColor: '#999999',
    subtitleFontSize: 15,
    toolTipPadding: 3,
    toolTipBackground: '#000000',
    toolTipOpacity: 0.7,
    toolTipLineHeight: 14,
    radarGridCount: 3,
    radarLabelTextMargin: 15
};

// 获取画布宽高
function getCanvasSize(ctx) {
    try {
        const sysInfo = wx.getSystemInfoSync();
        const width = ctx.canvas.width || sysInfo.windowWidth;
        const height = ctx.canvas.height || 200;
        return { width, height };
    } catch (e) {
        console.error("获取设备信息失败:" + e);
        return { width: 320, height: 200 };
    }
}

// 创建线性图表
function createLineChart(opts) {
    const ctx = wx.createCanvasContext(opts.canvasId);
    const { width, height } = getCanvasSize(ctx);
    
    const padding = opts.padding || config.padding;
    const fontSize = opts.fontSize || config.fontSize;
    
    // 设置Y轴
    const yAxisHeight = height - 2 * padding - config.xAxisHeight;
    const yAxisWidth = config.yAxisWidth;
    
    // 设置X轴
    const xAxisWidth = width - 2 * padding - yAxisWidth;
    
    // 绘制Y轴
    ctx.beginPath();
    ctx.setLineWidth(1);
    ctx.setStrokeStyle('#CCCCCC');
    ctx.moveTo(padding + yAxisWidth, padding);
    ctx.lineTo(padding + yAxisWidth, height - padding - config.xAxisHeight);
    ctx.stroke();
    
    // 绘制X轴
    ctx.beginPath();
    ctx.setLineWidth(1);
    ctx.setStrokeStyle('#CCCCCC');
    ctx.moveTo(padding + yAxisWidth, height - padding - config.xAxisHeight);
    ctx.lineTo(width - padding, height - padding - config.xAxisHeight);
    ctx.stroke();
    
    // 计算Y轴刻度
    const yAxisSplit = opts.yAxis && opts.yAxis.split || config.yAxisSplit;
    const maxData = Math.max.apply(null, opts.series[0].data);
    const minData = opts.yAxis && opts.yAxis.min || 0;
    const range = maxData - minData;
    const yStep = range / yAxisSplit;
    
    // 绘制Y轴刻度和网格
    for (let i = 0; i <= yAxisSplit; i++) {
        const y = padding + yAxisHeight - (i / yAxisSplit) * yAxisHeight;
        const value = minData + yStep * i;
        
        // 绘制Y轴文本
        ctx.setFontSize(fontSize);
        ctx.setFillStyle('#666666');
        ctx.fillText(value.toFixed(0), padding, y + fontSize / 2);
        
        // 绘制网格线
        ctx.beginPath();
        ctx.setLineWidth(1);
        ctx.setStrokeStyle('#EEEEEE');
        ctx.moveTo(padding + yAxisWidth, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // 绘制X轴类别
    const categories = opts.categories || [];
    const xStep = xAxisWidth / (categories.length - 1);
    
    for (let i = 0; i < categories.length; i++) {
        const x = padding + yAxisWidth + i * xStep;
        const text = categories[i];
        
        ctx.setFontSize(fontSize);
        ctx.setFillStyle('#666666');
        ctx.fillText(text, x - ctx.measureText(text).width / 2, height - padding);
    }
    
    // 绘制数据线
    const series = opts.series[0];
    const data = series.data;
    const points = [];
    
    ctx.beginPath();
    ctx.setLineWidth(2);
    ctx.setStrokeStyle(series.color || config.colors[0]);
    
    for (let i = 0; i < data.length; i++) {
        const x = padding + yAxisWidth + i * xStep;
        const y = padding + yAxisHeight - ((data[i] - minData) / range) * yAxisHeight;
        
        points.push([x, y]);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.stroke();
    
    // 绘制数据点
    for (let i = 0; i < points.length; i++) {
        const [x, y] = points[i];
        
        ctx.beginPath();
        ctx.setFillStyle(series.color || config.colors[0]);
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    ctx.draw();
}

// 创建柱状图
function createColumnChart(opts) {
    const ctx = wx.createCanvasContext(opts.canvasId);
    const { width, height } = getCanvasSize(ctx);
    
    const padding = opts.padding || config.padding;
    const fontSize = opts.fontSize || config.fontSize;
    
    // 设置Y轴
    const yAxisHeight = height - 2 * padding - config.xAxisHeight;
    const yAxisWidth = config.yAxisWidth;
    
    // 设置X轴
    const xAxisWidth = width - 2 * padding - yAxisWidth;
    
    // 绘制Y轴
    ctx.beginPath();
    ctx.setLineWidth(1);
    ctx.setStrokeStyle('#CCCCCC');
    ctx.moveTo(padding + yAxisWidth, padding);
    ctx.lineTo(padding + yAxisWidth, height - padding - config.xAxisHeight);
    ctx.stroke();
    
    // 绘制X轴
    ctx.beginPath();
    ctx.setLineWidth(1);
    ctx.setStrokeStyle('#CCCCCC');
    ctx.moveTo(padding + yAxisWidth, height - padding - config.xAxisHeight);
    ctx.lineTo(width - padding, height - padding - config.xAxisHeight);
    ctx.stroke();
    
    // 计算Y轴刻度
    const yAxisSplit = opts.yAxis && opts.yAxis.split || config.yAxisSplit;
    const maxData = Math.max.apply(null, opts.series[0].data);
    const minData = opts.yAxis && opts.yAxis.min || 0;
    const range = maxData - minData;
    const yStep = range / yAxisSplit;
    
    // 绘制Y轴刻度和网格
    for (let i = 0; i <= yAxisSplit; i++) {
        const y = padding + yAxisHeight - (i / yAxisSplit) * yAxisHeight;
        const value = minData + yStep * i;
        
        // 绘制Y轴文本
        ctx.setFontSize(fontSize);
        ctx.setFillStyle('#666666');
        ctx.fillText(value.toFixed(0), padding, y + fontSize / 2);
        
        // 绘制网格线
        ctx.beginPath();
        ctx.setLineWidth(1);
        ctx.setStrokeStyle('#EEEEEE');
        ctx.moveTo(padding + yAxisWidth, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // 绘制X轴类别
    const categories = opts.categories || [];
    const xStep = xAxisWidth / categories.length;
    const barWidth = xStep - 2 * config.columePadding;
    
    for (let i = 0; i < categories.length; i++) {
        const x = padding + yAxisWidth + i * xStep + xStep / 2;
        const text = categories[i];
        
        ctx.setFontSize(fontSize);
        ctx.setFillStyle('#666666');
        ctx.fillText(text, x - ctx.measureText(text).width / 2, height - padding);
    }
    
    // 绘制柱状图
    const series = opts.series[0];
    const data = series.data;
    
    for (let i = 0; i < data.length; i++) {
        const value = data[i];
        const x = padding + yAxisWidth + i * xStep + config.columePadding;
        const height_val = (value - minData) / range * yAxisHeight;
        const y = height - padding - config.xAxisHeight - height_val;
        
        ctx.beginPath();
        ctx.setFillStyle(series.color || config.colors[0]);
        ctx.rect(x, y, barWidth, height_val);
        ctx.fill();
    }
    
    ctx.draw();
}

// 创建饼图
function createPieChart(opts) {
    const ctx = wx.createCanvasContext(opts.canvasId);
    const { width, height } = getCanvasSize(ctx);
    const series = opts.series || [];
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - config.padding;
    
    // 计算总和
    const sum = series.reduce((acc, item) => acc + item.data, 0);
    
    // 绘制饼图
    let startAngle = 0;
    
    for (let i = 0; i < series.length; i++) {
        const item = series[i];
        const percentage = item.data / sum;
        const endAngle = startAngle + percentage * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.setFillStyle(item.color || config.colors[i % config.colors.length]);
        ctx.fill();
        
        // 绘制标签
        if (opts.dataLabel) {
            const midAngle = startAngle + (endAngle - startAngle) / 2;
            const labelX = centerX + (radius + config.pieChartLinePadding) * Math.cos(midAngle);
            const labelY = centerY + (radius + config.pieChartLinePadding) * Math.sin(midAngle);
            
            ctx.setFontSize(config.fontSize);
            ctx.setFillStyle('#333333');
            ctx.fillText(item.name, labelX - ctx.measureText(item.name).width / 2, labelY);
        }
        
        startAngle = endAngle;
    }
    
    // 绘制中心空白
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
    ctx.setFillStyle('#FFFFFF');
    ctx.fill();
    
    ctx.draw();
}

// 图表类
function WxCharts(opts) {
    this.canvasId = opts.canvasId;
    this.type = opts.type;
    this.categories = opts.categories;
    this.series = opts.series;
    this.yAxis = opts.yAxis;
    this.width = opts.width;
    this.height = opts.height;
    this.dataLabel = opts.dataLabel;
    
    this.init();
}

WxCharts.prototype.init = function() {
    switch (this.type) {
        case 'line':
            createLineChart(this);
            break;
        case 'column':
            createColumnChart(this);
            break;
        case 'pie':
            createPieChart(this);
            break;
        default:
            console.error('Unsupported chart type: ' + this.type);
    }
};

WxCharts.prototype.updateData = function(opts) {
    if (opts.categories) {
        this.categories = opts.categories;
    }
    if (opts.series) {
        this.series = opts.series;
    }
    
    this.init();
};

module.exports = WxCharts; 