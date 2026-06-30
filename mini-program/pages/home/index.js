"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = __importStar(require("../../utils/api"));
const formatDate_1 = require("../../utils/formatDate");
function normalizeSwiperImages(components) {
    return components.map((comp) => {
        var _a;
        if (comp.type === 'swiper' && Array.isArray((_a = comp.props) === null || _a === void 0 ? void 0 : _a.images)) {
            comp.props.images = comp.props.images.map((img) => typeof img === 'string' ? { src: img, link: '' } : img);
        }
        return comp;
    });
}
Page({
    data: {
        exhibitions: [],
        activities: [],
        _homeExhibitions: [],
        _homeActivities: [],
        diyComponents: [],
        diyBackgroundStyle: '',
        loading: true,
    },
    onLoad(options) {
        // 已登录用户直接打开分享链接时记录推广点击
        if (options.promoterId) {
            api_1.default.post('/promotion/click', { promoterId: Number(options.promoterId) }).catch(() => { });
        }
        this.fetchData();
    },
    fetchData() {
        return __awaiter(this, void 0, void 0, function* () {
            this.setData({ loading: true });
            try {
                const [exhibitions, activities, diyPage] = yield Promise.all([
                    api_1.default.get('/exhibitions').catch(() => []),
                    api_1.default.get('/activities').catch(() => []),
                    api_1.default.get('/diy-page/active', { pageKey: 'home' }).catch(() => null),
                ]);
                const diyConfig = diyPage === null || diyPage === void 0 ? void 0 : diyPage.config;
                const bg = (diyConfig === null || diyConfig === void 0 ? void 0 : diyConfig.background) || {};
                let bgStyle = '';
                if (bg.image) {
                    const absBgImg = typeof bg.image === 'string' && bg.image.startsWith('/uploads/')
                        ? (0, api_1.resolveImageUrls)(bg.image)
                        : bg.image;
                    const size = bg.size || 'cover';
                    const position = bg.position || 'center center';
                    const repeat = size === 'repeat' ? 'repeat' : 'no-repeat';
                    bgStyle = `background:url(${absBgImg}) ${repeat} ${position}/${size}, ${bg.color || 'transparent'};`;
                }
                else if (bg.color) {
                    bgStyle = `background:${bg.color};`;
                }
                const exhList = (0, api_1.resolveImageUrls)(exhibitions || []);
                const actList = (0, api_1.resolveImageUrls)(activities || []);
                const homeActs = actList.slice(0, 4);
                const statusMap = {
                    UPCOMING: { label: '即将开始', color: '#005bac' },
                    ONGOING: { label: '进行中', color: '#07c160' },
                    ENDED: { label: '已结束', color: '#888888' },
                };
                homeActs.forEach(act => {
                    act._startTime = (0, formatDate_1.formatDate)(act.startTime).split(' ')[0];
                    act._endTime = (0, formatDate_1.formatDate)(act.endTime).split(' ')[0];
                    const sc = statusMap[act.status] || { label: '', color: '#999' };
                    act._statusLabel = sc.label;
                    act._statusColor = sc.color;
                    act._address = act.location || '';
                });
                const rawComponents = normalizeSwiperImages((0, api_1.resolveImageUrls)(diyConfig === null || diyConfig === void 0 ? void 0 : diyConfig.components) || []);
                this.setData({
                    exhibitions: exhList,
                    activities: actList,
                    _homeExhibitions: exhList.slice(0, 4),
                    _homeActivities: homeActs,
                    diyComponents: rawComponents,
                    diyBackgroundStyle: bgStyle,
                });
            }
            finally {
                this.setData({ loading: false });
            }
        });
    },
    // === DIY 组件交互事件 ===
    onDiySwiperTap(e) {
        const { link } = e.currentTarget.dataset;
        if (link)
            wx.navigateTo({ url: link });
    },
    onFuncGridTap(e) {
        const { url } = e.currentTarget.dataset;
        if (!url)
            return;
        if (url.startsWith('/')) {
            wx.navigateTo({ url });
        }
        else if (url.startsWith('http')) {
            wx.setClipboardData({ data: url });
        }
    },
    onDiyImageTap(e) {
        const { link } = e.currentTarget.dataset;
        if (link) {
            if (link.startsWith('/'))
                wx.navigateTo({ url: link });
            else
                wx.setClipboardData({ data: link });
        }
    },
    onMediaGridTap(e) {
        const { link } = e.currentTarget.dataset;
        if (link) {
            if (link.startsWith('/'))
                wx.navigateTo({ url: link });
            else
                wx.setClipboardData({ data: link });
        }
    },
    onColumnsTap(e) {
        const { link } = e.currentTarget.dataset;
        if (link) {
            if (link.startsWith('/'))
                wx.navigateTo({ url: link });
            else
                wx.setClipboardData({ data: link });
        }
    },
    onDiyButtonTap(e) {
        const { link } = e.currentTarget.dataset;
        if (link) {
            if (link.startsWith('/'))
                wx.navigateTo({ url: link });
            else
                wx.setClipboardData({ data: link });
        }
    },
    onDiyNavigationTap(e) {
        const { latitude, longitude, name, address } = e.currentTarget.dataset;
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (isNaN(lat) || isNaN(lng)) {
            wx.showModal({
                title: '导航调试',
                content: `坐标无效\nlat=${latitude}\nlng=${longitude}\nname=${name}\naddr=${address}`,
            });
            return;
        }
        wx.openLocation({
            latitude: lat,
            longitude: lng,
            name: name || '',
            address: address || '',
            scale: 16,
            fail: function (err) {
                wx.showModal({ title: '打开地图失败', content: JSON.stringify(err) });
            },
        });
    },
    goExhibitionDetail(e) {
        const { id } = e.currentTarget.dataset;
        wx.navigateTo({ url: `/pages/exhibition-detail/index?id=${id}` });
    },
    goActivityDetail(e) {
        const { id } = e.currentTarget.dataset;
        wx.navigateTo({ url: `/pages/activity-detail/index?id=${id}` });
    },
    goExhibitionList() {
        wx.navigateTo({ url: '/pages/exhibitions/index' });
    },
    goActivityList() {
        wx.navigateTo({ url: '/pages/activities/index' });
    },
    goMyReservations() {
        const app = getApp();
        if (!app.globalData.token) {
            wx.navigateTo({ url: '/pages/login/index' });
            return;
        }
        wx.navigateTo({ url: '/pages/my-reservations/index' });
    },
});
