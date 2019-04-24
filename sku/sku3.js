/**
 * @Author: zhaoFinger
 * @Date: 2017-11-07 00:46:38
 * @Last Modified by: zhaoFinger
 * @Last Modified time: 2017-11-10 11:55:06
 */

/**
 * 拿到的数据
 *[
 *   {'颜色': '红', '尺码': '大', '型号': 'A', 'id': '001'},
 *   {'颜色': '红', '尺码': '中', '型号': 'A', 'id': '002'},
 *   {'颜色': '红', '尺码': '大', '型号': 'B', 'id': '003'},
 *   {'颜色': '黑', '尺码': '中', '型号': 'B', 'id': '004'},
 *   {'颜色': '白', '尺码': '中', '型号': 'A', 'id': '005'},
 *   {'颜色': '白', '尺码': '大', '型号': 'A', 'id': '006'},
 *   {'颜色': '绿', '尺码': '大', '型号': 'B', 'id': '007'}
 *]
 */
/**
 * 显示到页面
 * {
 *   '颜色': ['红', '黑', '白', '绿'],
 *   '尺码': ['大', '中', '小'],
 *   '型号': ['A', 'B']
 * }
 */
// 模板渲染
var renderTpl = (template, params, pureHtml, escape) => {
    var rtn = template.replace(/\{\$(.+?)\}/gi, function (total, param) {
        return (params[param] === undefined) ? total : (escape ? encodeURIComponent(params[param]) : params[param]);
    });
    return pureHtml ? rtn : $(rtn);
};
let goodsData = [
    {'颜色': '红', '尺码': '大', '型号': 'A', 'id': '001', 'num': 0},
    {'颜色': '红', '尺码': '中', '型号': 'A', 'id': '002', 'num': 0},
    {'颜色': '红', '尺码': '大', '型号': 'B', 'id': '003', 'num': 0},
    {'颜色': '黑', '尺码': '中', '型号': 'B', 'id': '004', 'num': 3},
    {'颜色': '白', '尺码': '中', '型号': 'A', 'id': '005', 'num': 2},
    {'颜色': '白', '尺码': '大', '型号': 'A', 'id': '006', 'num': 1},
    {'颜色': '绿', '尺码': '大', '型号': 'B', 'id': '007', 'num': 0},
    {'颜色': '绿', '尺码': '大', '型号': 'C', 'id': '008', 'num': 1}
];
const sku = {
    // 原始数据
    data: [],

    // 展示数据
    showData: {},

    // 所有属性二维数组
    allKeys: [],

    // 所有商品数据字典
    goodsDict: {},

    // 缓存查找数据
    cacheData: {},

    // 所有可选属性
    result: [],

    // 确定的ID
    resultID: '',
    /**
     * 计算展示数据
     * 计算字典数据
     */
    calculateShowData() {
        for (let item of this.data) {
            let _dict = '';
            for (let key in item) {
                if (key !== 'id' && key !== 'num') {
                    _dict += item[key] + ';';
                }
                if (this.showData[key]) {
                    // 去重
                    if (this.showData[key].indexOf(item[key]) === -1) {
                        this.showData[key].push(item[key]);
                    }
                } else {
                    this.showData[key] = new Array(item[key]);
                }
            }
            if (item.num > 0) {
                this.goodsDict[_dict] = {
                    id: item.id,
                    num: item.num
                };
            }
        }

        for (let key in this.showData) {
            this.allKeys.push(this.showData[key]);
        }
        console.log(this.goodsDict);
        console.log(this.allKeys);
        console.log(this.showData);
    },
    /**
     * 得到结果
     * @param {string} key 查找关键字以；分割
     * @return {array} 所有可选属性数组
     */
    getResult(key, isRealFind = true) {
        // 如缓存中存在，则直接返回结果
        if (this.cacheData[key] && isRealFind) {
            this.result = this.cacheData[key];
            this.resultID = this.goodsDict[key] ? this.goodsDict[key] : '';
            console.log(this.resultID);
            return this.result;
        }

        // 继续查找
        let result = '';
        for (let _key in this.goodsDict) {
            let keyArr = key.split(';');
            let _keyArr = _key.split(';');
            let arr = keyArr.concat(_keyArr);
            arr = Array.from(new Set(arr));
            if (arr.length === _keyArr.length) {
                result += _key;
            }
        }

        if (isRealFind) {
            // 所有可选属性
            this.result = result.split(';');
            let _keyArr = key.split(';');
            if (_keyArr[_keyArr.length - 1] === '') {
                _keyArr.pop();
            }
            for (let i = 0; i < _keyArr.length; i++) {
                let _arr = key.split(';');
                let str = _arr.splice(i, 1);
                let oldResult = this.getResult(_arr.join(';'), false);
                let index = '';
                // 获取该key所在索引
                this.allKeys.forEach((item, i) => {
                    if (item.indexOf(str.join('')) !== -1) {
                        index = i;
                        return;
                    }
                });
                oldResult = oldResult.split(';');
                this.allKeys[index].forEach(item => {
                    if (oldResult.indexOf(item) !== -1) {
                        this.result.push(item);
                    }
                });
            }
            this.result = Array.from(new Set(this.result));

            // 缓存数据
            this.cacheData[key] = this.result;
            this.resultID = this.goodsDict[key] ? this.goodsDict[key] : '';
            console.log(this.resultID);
            return this.result;
        } else {
            return result;
        }
    },
    /**
     * 页面渲染
     */
    renderPage($cateTpl, $btnTpl, $dom) {
        let index = 0;
        for (let key in sku.showData) {
            if (key === 'id') {
                return;
            } else {
                let $item = renderTpl($cateTpl, {key}).appendTo($dom);
                sku.showData[key].forEach(item => {
                    renderTpl($btnTpl, {item, index}).appendTo($item);
                });
            }
            index++;
        }
    },
    init(data, $parentText, $btnText, $wrapper) {
        this.data = data;
        this.calculateShowData();
        this.renderPage($parentText, $btnText, $wrapper);
        this.getResult('', []);
    },
    pageShow($btn) {
        let choose = [];
        $btn.on('click', function() {
            let key = '';
            let index = $(this).attr('data-index');
            choose[index] = $(this).text();
            choose.forEach(item => {
                let $btn = $('button[data-name="' + item + '"]');
                if ($btn.hasClass('checked') && item === $(this).text()) {
                    $btn.removeClass('checked');
                    choose[index] = '';
                } else {
                    $btn.addClass('checked').siblings().removeClass('checked');
                    if (item !== '') {
                        key += item + ';';
                    }
                }
            });
            let result = sku.getResult(key);
            $btn.removeClass('can-check').attr('disabled', true);
            result.forEach(item => {
                $('button[data-name="' + item + '"]').addClass('can-check').attr('disabled', false);
            });
        });
    }
};

sku.init(goodsData, $('#cate_item').text(), $('#btn_arr').text(), $('.sku-wrapper'), $('.sku-wrapper button'));
sku.pageShow($('.sku-wrapper button'));