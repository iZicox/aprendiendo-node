
// crear error personalizado
export class AppError extends Error {
    constructor(msg, status){
        super(msg);
        this.status = status;
    }
}