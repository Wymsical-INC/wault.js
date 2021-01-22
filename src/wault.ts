export class Wault {
    private readonly _waultAuthorityUrl: string;
    private readonly _waultApiUrl: string;
    private readonly _waultPortalUrl: string;
    private readonly _clientId: string;
    private readonly _userEmail: string;
    private readonly _waultId: string;

    private _loginFrame: HTMLElement;

    private SESSION_STORAGE_KEY = 'wault.user';

    constructor(clientId: string, userEmail: string, waultId: string, waultAuthorityUrl: string, waultApiUrl: string, waultPortalUrl: string) {
        this._waultAuthorityUrl = waultAuthorityUrl.endsWith('/') ? waultAuthorityUrl.substr(0, waultAuthorityUrl.length - 1) : waultAuthorityUrl;
        this._waultApiUrl = waultApiUrl.endsWith('/') ? waultApiUrl.substr(0, waultApiUrl.length - 1) : waultApiUrl;
        this._waultPortalUrl = waultPortalUrl.endsWith('/') ? waultPortalUrl.substr(0, waultPortalUrl.length - 1) : waultPortalUrl;
        this._clientId = clientId;
        this._userEmail = userEmail;
        this._waultId = waultId;
    }

    async loadEntries(path: string = '/', pageIndex: number = 0, pageSize: number = 20, sharable: boolean = true, searchKey: string = ''): Promise<any> {
        await this.checkSignInStatus();
        var url = new URL(`${this._waultApiUrl}/api/entries/V2`);
        url.searchParams.append('path', path);
        url.searchParams.append('pageIndex', pageIndex.toString());
        url.searchParams.append('pageSize', pageSize.toString());
        url.searchParams.append('searchKey', searchKey);
        url.searchParams.append('sharable', sharable ? 'true' : 'false');
        return await this.loadFromApi(url.href);
    }

    loadClaim(accessToken: string): Promise<any> {
        var url = new URL(`${this._waultApiUrl}/api/v2/entries/claim`);
        url.searchParams.append('accessToken', accessToken);
        return this.loadFromApi(url.href);
    }

    getDocumentUrl(accessToken: string){
        var url = new URL(`${this._waultPortalUrl}/documents/view`);
        url.searchParams.append('token', accessToken);
        return url.href;
    }

    getFileUrl(accessToken: string) {
        var url = new URL(`${this._waultApiUrl}/api/v2/entries/file`);
        url.searchParams.append('accessToken', accessToken);
        return url.href;
    }

    async requestAccessTokens(claimTypes: string[], documentIds: string[], signature: boolean = true, email: string = null, organizationId: string = null): Promise<any> {
        await this.checkSignInStatus();
        var url = `${this._waultApiUrl}/api/v2/entries/accessRequests`;
        return this.postToApi(url, {
            claimTypes: claimTypes,
            documentIds: documentIds,
            email: email,
            signature: signature,
            organizationId: organizationId
        });
    }

    async shareEntry(id: string, shareTo: string, allowDownload: boolean = true): Promise<any> {
        await this.checkSignInStatus();
        var url = `${this._waultApiUrl}/api/v2/entries/share`;
        var postData = {
            shareTo: shareTo,
            id: id,
            permissions: []
        };

        if (allowDownload) {
            postData.permissions.push({ type: 'Download' });
        }
        return this.postToApi(url, postData);
    }

    async loadDocumentClaims(documentId: string): Promise<any> {
        await this.checkSignInStatus();
        var url = `${this._waultApiUrl}/api/documents/${documentId}/claims`;
        return this.loadFromApi(url);
    }

    async getAccessRequestResult(trackId: string): Promise<any> {
        await this.checkSignInStatus();
        var url = `${this._waultApiUrl}/api/v2/entries/accessRequests/${trackId}`;
        return this.loadFromApi(url);
    }

    private loadFromApi(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            var request = new XMLHttpRequest();
            request.onreadystatechange = () => {
                if (request.readyState === 4) {
                    if (request.status == 200) {
                        resolve(JSON.parse(request.responseText));
                    }
                }
            };
            request.onerror = () => {
                reject();
            };

            request.open('GET', url);
            if (this.getUser()) {
                request.setRequestHeader('Authorization', `bearer ${this.getUser().access_token}`);
                request.setRequestHeader('deviceId', this.getUser().device_id);
            }
            request.send();
        });
    }

    private postToApi(url: string, data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            var request = new XMLHttpRequest();
            request.onreadystatechange = () => {
                if (request.readyState === 4) {
                    if (request.status === 200) {
                        resolve(JSON.parse(request.responseText));
                    }
                }
            };

            request.onerror = () => {
                reject();
            };

            request.open('POST', url);
            request.setRequestHeader('Content-Type', "application/json;charset=UTF-8");
            request.setRequestHeader('Authorization', `bearer ${this.getUser().access_token}`);
            request.setRequestHeader('deviceId', this.getUser().device_id);
            request.send(JSON.stringify(data));
        });
    }

    private removeLoginFrame() {
        if (this._loginFrame) {
            document.body.removeChild(this._loginFrame);
            this._loginFrame = null;
        }
    }

    checkSignInStatus(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.isAuthorized()) {
                resolve(true);
            } else if (!this._loginFrame) {
                this._loginFrame = document.createElement('iframe');
                this._loginFrame.setAttribute('id', 'wault_frame');
                this._loginFrame.setAttribute('src', `${this._waultAuthorityUrl}/Account/SignInFrame?clientId=${this._clientId}&waultId=${this._waultId}&email=${this._userEmail}`);
                this._loginFrame.style.backgroundImage = `url("${this._waultAuthorityUrl}/images/wym_logo.svg")`;

                document.body.appendChild(this._loginFrame);
                window.addEventListener('message', (event) => {
                    if (event.origin === this._waultAuthorityUrl) {
                        switch (event.data.action) {

                            case 'loginFrameClose':
                                this.removeLoginFrame();
                                reject('loginFrameClosed');
                                break;

                            case 'waultSignedIn':
                                this.removeLoginFrame();
                                let now = new Date();
                                let signedInAt = now.getTime();
                                let expiresAt = signedInAt + Number(event.data.expiresIn) * 1000;

                                let user = {
                                    access_token: event.data.accessToken,
                                    device_id: event.data.deviceId,
                                };

                                this.setCookie(this.SESSION_STORAGE_KEY, JSON.stringify(user), expiresAt);
                                resolve(true);
                                break;

                            default:
                                this.removeLoginFrame();
                                reject('loginFrameClosed');
                                break;
                        }
                    }
                });
            }
        });


    }

    private getUser() {
        let userStr = this.getCookie(this.SESSION_STORAGE_KEY);
        if (!userStr) {
            return null;
        }
        return JSON.parse(userStr);
    }

    private isAuthorized(): boolean {
        if (this.getUser()) {
            return true;
        } else {
            return false;
        }
    }

    private setCookie(name: string, val: string, expiresAt: number) {
        const date = new Date();
        const value = val;

        date.setTime(expiresAt);

        document.cookie = name + "=" + value + "; expires=" + date.toUTCString() + "; path=/";
    }

    private getCookie(name: string) {
        const value = "; " + document.cookie;
        const parts = value.split("; " + name + "=");

        if (parts.length == 2) {
            return parts.pop().split(";").shift();
        }
    }

    private deleteCookie(name: string) {
        const date = new Date();

        date.setTime(date.getTime() + (-1 * 24 * 60 * 60 * 1000));

        document.cookie = name + "=; expires=" + date.toUTCString() + "; path=/";
    }


}
