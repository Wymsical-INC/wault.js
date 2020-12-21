"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wault = void 0;
var Wault = /** @class */ (function () {
    function Wault(waultAuthorityUrl, waultApiUrl, clientId, userEmail, waultId) {
        this.SESSION_STORAGE_KEY = 'wault.user';
        this._waultAuthorityUrl = waultAuthorityUrl;
        this._waultApiUrl = waultApiUrl;
        this._clientId = clientId;
        this._userEmail = userEmail;
        this._waultId = waultId;
    }
    Wault.prototype.loadEntries = function (path, pageIndex, pageSize, sharable, searchKey) {
        var _this = this;
        if (path === void 0) { path = '/'; }
        if (pageIndex === void 0) { pageIndex = 0; }
        if (pageSize === void 0) { pageSize = 20; }
        if (sharable === void 0) { sharable = true; }
        if (searchKey === void 0) { searchKey = ''; }
        return this.checkSignInStatus()
            .then(function () {
            var url = new URL(_this._waultApiUrl + "/api/entries/V2");
            url.searchParams.append('path', path);
            url.searchParams.append('pageIndex', pageIndex.toString());
            url.searchParams.append('pageSize', pageSize.toString());
            url.searchParams.append('searchKey', searchKey);
            url.searchParams.append('sharable', sharable ? 'true' : 'false');
            return _this.loadFromApi(url.href);
        });
    };
    Wault.prototype.loadDocumentClaims = function (documentId) {
        var _this = this;
        return this.checkSignInStatus().then(function () {
            var url = _this._waultApiUrl + "/api/documents/" + documentId + "/claims";
            return _this.loadFromApi(url);
        });
    };
    Wault.prototype.loadFromApi = function (url) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var request = new XMLHttpRequest();
            request.onreadystatechange = function () {
                if (request.readyState === 4) {
                    if (request.status == 200) {
                        resolve(JSON.parse(request.responseText));
                    }
                }
            };
            request.onerror = function () {
                reject();
            };
            request.open('GET', url);
            request.setRequestHeader('Authorization', "bearer " + _this.getUser().access_token);
            request.setRequestHeader('deviceId', _this.getUser().device_id);
            request.send();
        });
    };
    Wault.prototype.removeLoginFrame = function () {
        if (this._loginFrame) {
            document.body.removeChild(this._loginFrame);
            this._loginFrame = null;
        }
    };
    Wault.prototype.checkSignInStatus = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.isAuthorized()) {
                resolve();
            }
            else if (!_this._loginFrame) {
                _this._loginFrame = document.createElement('iframe');
                _this._loginFrame.setAttribute('id', 'wault_frame');
                _this._loginFrame.setAttribute('src', _this._waultAuthorityUrl + "/Account/SignInFrame?clientId=" + _this._clientId + "&waultId=" + _this._waultId + "&email=" + _this._userEmail);
                _this._loginFrame.style.backgroundImage = "url(\"" + _this._waultAuthorityUrl + "/images/wym_logo.svg\")";
                document.body.appendChild(_this._loginFrame);
                window.addEventListener('message', function (event) {
                    if (event.origin === _this._waultAuthorityUrl) {
                        switch (event.data.action) {
                            case 'loginFrameClose':
                                _this.removeLoginFrame();
                                reject();
                                break;
                            case 'waultSignedIn':
                                _this.removeLoginFrame();
                                var now = new Date();
                                var signedInAt = now.getTime();
                                var expiresAt = signedInAt + Number(event.data.expiresIn) * 1000;
                                var user = {
                                    access_token: event.data.accessToken,
                                    device_id: event.data.deviceId,
                                };
                                _this.setCookie(_this.SESSION_STORAGE_KEY, JSON.stringify(user), expiresAt);
                                resolve();
                                break;
                            default:
                                _this.removeLoginFrame();
                                reject();
                                break;
                        }
                    }
                });
            }
        });
    };
    Wault.prototype.getUser = function () {
        var userStr = this.getCookie(this.SESSION_STORAGE_KEY);
        if (!userStr) {
            return null;
        }
        return JSON.parse(userStr);
    };
    Wault.prototype.isAuthorized = function () {
        if (this.getUser()) {
            return true;
        }
        else {
            return false;
        }
    };
    Wault.prototype.setCookie = function (name, val, expiresAt) {
        var date = new Date();
        var value = val;
        date.setTime(expiresAt);
        document.cookie = name + "=" + value + "; expires=" + date.toUTCString() + "; path=/";
    };
    Wault.prototype.getCookie = function (name) {
        var value = "; " + document.cookie;
        var parts = value.split("; " + name + "=");
        if (parts.length == 2) {
            return parts.pop().split(";").shift();
        }
    };
    Wault.prototype.deleteCookie = function (name) {
        var date = new Date();
        date.setTime(date.getTime() + (-1 * 24 * 60 * 60 * 1000));
        document.cookie = name + "=; expires=" + date.toUTCString() + "; path=/";
    };
    return Wault;
}());
exports.Wault = Wault;
//# sourceMappingURL=wault.js.map