class Particle {
    constructor(x,y,u,v,m,gu,gv,minX,maxX,minY,maxY) {
        this.x = x;
        this.y = y;
        this.u = u;
        this.v = v;
        this.m = m;
        this.gu = gu;
        this.gv = gv;
        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;
    }

    update() {
        this.x += this.u;
        this.y += this.v;

        this.u -= this.m*this.gu;
        this.v -= this.m*this.gv;

        // this.y < minY
        if (this.x < this.minX || this.x > this.maxX || this.y > this.maxY)
            return false;
        return true;
    }

    draw(ctx) {
        ctx.moveTo(this.x,this.y);
        ctx.lineTo(this.x+this.u,this.y+this.v);
        // ctx.fillRect(this.x-this.v/2,this.y-this.u/2,Math.max(1,Math.abs(this.v)),Math.max(1,Math.abs(this.u)));
    }
}
