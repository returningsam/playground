class Particle {
    constructor(x,y,u,v,m,gu,gv,minX,maxX,minY,maxY) {
        this.x = x;
        this.y = y;
        this.sx = x;
        this.sy = y;
        this.u = u;
        this.v = v;
        this.m = m;
        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;
    }

    update(spring) {
        this.x += this.u;
        this.y += this.v;

        if (spring) {
            this.u -= this.m*(this.x-this.sx);
            this.v -= this.m*(this.y-this.sy);
        }

        // this.y < minY
        if (this.x < this.minX || this.x > this.maxX || this.y < this.minY || this.y > this.maxY)
            return false;
        return true;
    }

    drawLine(ctx) {
        if (this.x >= 0 && this.x <= ctx.canvas.width, this.y >= 0 && this.y <= ctx.canvas.height) {
            ctx.moveTo(this.x,this.y);
            ctx.lineTo(this.x+this.u,this.y+this.v);
        }
    }

    drawDot(ctx) {
        if (this.x >= 0 && this.x <= ctx.canvas.width, this.y >= 0 && this.y <= ctx.canvas.height) {
            ctx.fillRect(this.x-1/2,this.y-1/2,1,1);
        }
    }
}
